// src/components/Users/UserPermissionsTable.tsx
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

import { getUser } from "@/lib/services/users"
import {
  listAdminAvailableOptions,
  listProperties,
  assignUserPermissions,
  grantPropertyAccess,
  revokePropertyAccess,
  revokeResourcePermission,
} from "@/lib/services/permissions"

type UiPermissions = Record<string, Record<string, boolean>>

interface Props {
  userId: number
  onUpdated?: () => void | Promise<void>
}

/**
 * Panel que muestra y edita los permisos de un user:
 * - carga available_options desde /v1/permissions/admin/available_options/
 * - carga el usuario (getUser) para pre-popular los permisos
 * - permite togglear checkboxes por recurso/acción
 * - permite guardar: asigna permisos añadidos y revoca los eliminados
 * - también permite grant/revoke de propiedades
 */
export default function UserPermissionsTable({ userId, onUpdated }: Props) {
  const [loading, setLoading] = React.useState(false)
  const [loadingOptions, setLoadingOptions] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [userName, setUserName] = React.useState<string | null>(null)

  const [availableActions, setAvailableActions] = React.useState<Record<string, string[]>>({})
  const [resourceLabels, setResourceLabels] = React.useState<Record<string, string>>({})
  const [actionLabels, setActionLabels] = React.useState<Record<string, string>>({})

  const [permissions, setPermissions] = React.useState<UiPermissions>({})
  const initialCodenamesRef = React.useRef<Set<string>>(new Set<string>())
  const [properties, setProperties] = React.useState<Array<{ id: number; address?: string }>>([])
  const [selectedProperties, setSelectedProperties] = React.useState<Record<number, boolean>>({})
  const initialSelectedPropertiesRef = React.useRef<Set<number>>(new Set<number>())

  // Helper para obtener codenames del estado UI
  const uiPermissionsToCodenames = (ui: UiPermissions) => {
    const c: string[] = []
    for (const [res, actions] of Object.entries(ui)) {
      for (const [act, en] of Object.entries(actions)) {
        if (!en) continue
        c.push(`${res.toLowerCase()}.${act.toLowerCase()}`)
      }
    }
    return c
  }

  const getCodenamesFromPermissionsObj = (obj: any) => {
    const out: string[] = []
    if (!obj) return out
    // obj puede venir en muchas formas: la lógica intenta detectar keys y valores booleanos
    for (const k of Object.keys(obj)) {
      const val = obj[k]
      if (Array.isArray(val)) {
        // e.g. { guard: ['read','create'] }
        val.forEach((a) => out.push(`${k}.${String(a)}`))
      } else if (typeof val === "object" && val !== null) {
        for (const a of Object.keys(val)) {
          if (val[a]) out.push(`${k}.${a}`)
        }
      } else if (typeof val === "boolean") {
        // raro: { 'guard.read': true }
        if (k.includes(".")) {
          if (val) out.push(k)
        }
      }
    }
    return out
  }

  // Construye availableActions/resourceLabels/actionLabels desde available_options
  function buildFromAvailableOptions(opts: any, initialPermissionsFromUser?: any) {
    if (!opts) {
      // <-- FIX: aqui damos un tipo indexable para evitar el error TS
      const fallback: Record<string, string[]> = {
        guard: ["read", "create", "update", "delete"],
        client: ["read", "create", "update", "delete"],
      }
      setAvailableActions(fallback)
      setResourceLabels({})
      setActionLabels({})

      // seed permissions con false
      const seed: UiPermissions = {}
      Object.keys(fallback).forEach((r) => {
        seed[r] = {}
        fallback[r].forEach((a) => (seed[r][a] = false))
      })
      setPermissions(seed)
      initialCodenamesRef.current = new Set(getCodenamesFromPermissionsObj(initialPermissionsFromUser))
      return
    }

    // try structured fields
    const resourcesArr = Array.isArray(opts.resource_types) ? opts.resource_types : []
    const actionsArr = Array.isArray(opts.actions) ? opts.actions : []
    const resLabels: Record<string, string> = {}
    const actLabels: Record<string, string> = {}
    resourcesArr.forEach((r: any) => {
      const v = String(r.value ?? r).toLowerCase()
      resLabels[v] = String(r.label ?? r.value ?? v)
    })
    actionsArr.forEach((a: any) => {
      const v = String(a.value ?? a).toLowerCase()
      actLabels[v] = String(a.label ?? a.value ?? v)
    })
    setResourceLabels(resLabels)
    setActionLabels(actLabels)

    const av: Record<string, string[]> = {}
    if (resourcesArr.length > 0 && actionsArr.length > 0) {
      resourcesArr.forEach((r: any) => {
        const rv = String(r.value ?? r).toLowerCase()
        av[rv] = actionsArr.map((a: any) => String(a.value ?? a).toLowerCase())
      })
    } else {
      // fallback: available_options puede venir como lista de codenames o objetos
      if (Array.isArray(opts)) {
        opts.forEach((it: any) => {
          if (typeof it === "string") {
            const [sec = "", act = ""] = it.split(".")
            if (!av[sec]) av[sec] = []
            if (act && !av[sec].includes(act)) av[sec].push(act)
          } else if (typeof it === "object" && it !== null) {
            const codename = it.codename || it.permission || it.code || it.name || ""
            if (typeof codename === "string" && codename.includes(".")) {
              const [sec, act] = codename.split(".")
              if (!av[sec]) av[sec] = []
              if (!av[sec].includes(act)) av[sec].push(act)
            } else if (it.resource && it.action) {
              const sec = String(it.resource).toLowerCase()
              const act = String(it.action).toLowerCase()
              if (!av[sec]) av[sec] = []
              if (!av[sec].includes(act)) av[sec].push(act)
            }
          }
        })
      } else if (typeof opts === "object") {
        for (const key of Object.keys(opts)) {
          const v = opts[key]
          if (Array.isArray(v)) {
            av[key] = v.map((a: any) => String(a).toLowerCase())
          } else if (typeof v === "object" && v !== null) {
            av[key] = Object.keys(v).map((a) => String(a).toLowerCase())
          }
        }
      }
    }

    setAvailableActions(av)

    // Prepopulate permissions usando user.permissions si existe
    const seed: UiPermissions = {}
    for (const [res, acts] of Object.entries(av)) {
      seed[res] = {}
      for (const a of acts) {
        let val = false
        if (initialPermissionsFromUser) {
          const tryKeys = [res, res === "client" ? "cliente" : null, res === "guard" ? "guardia" : null].filter(Boolean) as string[]
          for (const k of tryKeys) {
            const section = (initialPermissionsFromUser as any)[k]
            if (section && typeof section === "object") {
              const candidateKeys = [a, a === "update" ? "edit" : null, a === "edit" ? "update" : null].filter(Boolean) as string[]
              for (const ck of candidateKeys) {
                if ((section as any)[ck] !== undefined) {
                  val = Boolean((section as any)[ck])
                  if (val) break
                }
              }
              if (val) break
            }
          }
        }
        seed[res][a] = val
      }
    }

    setPermissions(seed)
    // Combina codenames detectadas en usuario + las del seed
    initialCodenamesRef.current = new Set([
      ...getCodenamesFromPermissionsObj(initialPermissionsFromUser),
      ...uiPermissionsToCodenames(seed),
    ])
  }

  // carga principal: opciones + usuario + properties
  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoadingOptions(true)
      setError(null)
      try {
        const [optsRes, userRes, propsRes] = await Promise.allSettled([
          listAdminAvailableOptions(),
          getUser(userId),
          listProperties({ page_size: 500 }),
        ])

        if (!mounted) return

        const optsVal = optsRes.status === "fulfilled" ? optsRes.value : null
        const userVal = userRes.status === "fulfilled" ? userRes.value : null
        const propsVal = propsRes.status === "fulfilled" ? propsRes.value : []

        buildFromAvailableOptions(optsVal, (userVal as any)?.permissions ?? (userVal as any))

        // nombre de usuario para cabecera (first+last || username) con fallback al id
        setUserName((userVal as any)?.name ?? (userVal as any)?.username ?? null)

        // properties
        const items = Array.isArray(propsVal) ? propsVal : (propsVal?.results ?? [])
        const simple = items.map((p: any) => ({ id: p.id, address: p.address ?? p.name ?? String(p.id) }))
        setProperties(simple)

        const initialProps =
          (userVal as any)?.properties ??
          (userVal as any)?.property_access ??
          (userVal as any)?.accessible_properties ??
          (userVal as any)?.property_ids ??
          []
        const initialSet = new Set<number>((Array.isArray(initialProps) ? initialProps.map((n: any) => Number(n)).filter(Boolean) : []))
        const map: Record<number, boolean> = {}
        initialSet.forEach((id) => (map[Number(id)] = true))
        setSelectedProperties(map)
        initialSelectedPropertiesRef.current = initialSet
      } catch (err: unknown) {
        console.error("[UserPermissionsTable] load error", err)
        setError("Error cargando permisos/usuario")
      } finally {
        if (mounted) setLoadingOptions(false)
      }
    }
    void load()
    return () => {
      mounted = false
    }
  }, [userId])

  const handleToggle = (resource: string, action: string, checked: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [resource]: {
        ...(prev?.[resource] ?? {}),
        [action]: checked,
      },
    }))
  }

    const toggleProperty = (id: number, checked: boolean) => {
      setSelectedProperties((prev) => ({ ...prev, [id]: checked }))
    }

    const handleSave = async () => {
      setLoading(true)
      setError(null)
      try {
        const currentCodenames = new Set(uiPermissionsToCodenames(permissions))
        const initialCodenames = new Set(initialCodenamesRef.current)
        const added = Array.from(currentCodenames).filter((c) => !initialCodenames.has(c))
        const removed = Array.from(initialCodenames).filter((c) => !currentCodenames.has(c))

        if (added.length > 0) {
          try {
            await assignUserPermissions(userId, added)
            toast.success(`Asignados ${added.length} permisos`)
          } catch (err: any) {
            console.error("assignUserPermissions failed", err)
            toast.error("Error asignando permisos")
            throw err
          }
        }

        if (removed.length > 0) {
          const revokePromises = removed.map((codename) =>
            revokeResourcePermission(userId, codename)
              .catch((err) => {
                console.error("revokeResourcePermission failed for", codename, err)
                return null
              })
          )
          await Promise.allSettled(revokePromises)
          toast.success(`Revocados ${removed.length} permisos`)
        }

        // properties grant / revoke
        const currentSelectedIds = new Set(
          Object.entries(selectedProperties)
            .filter(([_, v]) => v)
            .map(([k]) => Number(k))
        )
        const initialSelected = new Set(initialSelectedPropertiesRef.current)

        const grantIds = Array.from(currentSelectedIds).filter((id) => !initialSelected.has(id))
        const revokeIds = Array.from(initialSelected).filter((id) => !currentSelectedIds.has(id))

        if (grantIds.length > 0) {
          const grantPromises = grantIds.map((pid) =>
            grantPropertyAccess(userId, pid).catch((err) => {
              console.error("grantPropertyAccess failed for", pid, err)
              return null
            })
          )
          await Promise.allSettled(grantPromises)
          toast.success(`Otorgado acceso a ${grantIds.length} propiedades`)
        }

        if (revokeIds.length > 0) {
          const revokePromises = revokeIds.map((pid) =>
            revokePropertyAccess(userId, pid).catch((err) => {
              console.error("revokePropertyAccess failed for", pid, err)
              return null
            })
          )
          await Promise.allSettled(revokePromises)
          toast.success(`Revocado acceso a ${revokeIds.length} propiedades`)
        }

      // Refresh baseline
      initialCodenamesRef.current = new Set(uiPermissionsToCodenames(permissions))
      initialSelectedPropertiesRef.current = new Set(Array.from(currentSelectedIds))

      if (onUpdated) await onUpdated()
    } catch (err: any) {
      console.error("[UserPermissionsTable] save error", err)
      setError("Error guardando cambios")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Permisos del usuario {userName ? userName : `#${userId}`}</h3>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              setLoadingOptions(true)
              try {
                const opts = await listAdminAvailableOptions()
                buildFromAvailableOptions(opts)
                toast.success("Opciones de permisos recargadas")
              } catch (err) {
                console.warn("refresh available options failed", err)
                toast.error("Error recargando opciones")
              } finally {
                setLoadingOptions(false)
              }
            }}
            disabled={loadingOptions}
          >
            Refrescar opciones
          </Button>
          <Button onClick={handleSave} disabled={loading || loadingOptions}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>

      {loadingOptions ? (
        <p>Cargando opciones y usuario…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : Object.keys(availableActions).length === 0 ? (
        <p>No hay opciones de permisos disponibles.</p>
      ) : (
        <div className="space-y-4">
          {/* Permisos por recurso */}
          <div className="border rounded p-2">
            <p className="font-semibold mb-2">Permisos por recurso</p>
            {Object.entries(availableActions).map(([res, acts]) => (
              <div key={res} className="mb-3">
                <p className="capitalize font-medium mb-1">{resourceLabels[res] ?? res}</p>
                <div className="overflow-x-auto whitespace-nowrap py-1">
                  {acts.map((act) => (
                    <label key={act} className="inline-block mr-4 align-middle">
                      <input
                        type="checkbox"
                        checked={Boolean(permissions[res]?.[act])}
                        onChange={(e) => handleToggle(res, act, e.target.checked)}
                        className="mr-1 align-middle"
                      />
                      <span className="text-sm align-middle">{actionLabels[act] ?? act}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">Permisos enviados como <code>resource.action</code>.</p>
          </div>

          {/* Propiedades */}
          <div className="border rounded p-2">
            <p className="font-semibold mb-2">Acceso a propiedades</p>
            {properties.length === 0 ? (
              <p className="text-sm">No se encontraron propiedades.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-auto">
                {properties.map((p) => (
                  <label key={p.id} className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(selectedProperties[p.id])} onChange={(e) => toggleProperty(p.id, e.target.checked)} />
                    <span className="text-sm">#{p.id} {p.address}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">Marcar para otorgar acceso; desmarcar para revocar.</p>
          </div>
        </div>
      )}
    </div>
  )
}
