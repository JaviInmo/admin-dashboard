"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  listAdminAvailableOptions,
  listUsersWithPermissions,
  listProperties,
  grantResourcePermission,
  revokeResourcePermissionById,
  grantPropertyAccess,
  revokePropertyAccessById,
} from "@/lib/services/permissions"

type UiPermissions = Record<string, Record<string, boolean>>

export interface UserPermissionsTableProps {
  userId: number
  userLabel?: string | null
  onUpdated?: () => void | Promise<void>
}

export default function UserPermissionsTable({ userId, userLabel, onUpdated }: UserPermissionsTableProps) {
  const [loading, setLoading] = React.useState(false)
  const [loadingOptions, setLoadingOptions] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [userName, setUserName] = React.useState<string | null>(null)

  const [availableActions, setAvailableActions] = React.useState<Record<string, string[]>>({})
  const [resourceLabels, setResourceLabels] = React.useState<Record<string, string>>({})
  const [actionLabels, setActionLabels] = React.useState<Record<string, string>>({})

  const [permissions, setPermissions] = React.useState<UiPermissions>({})
  const permissionIdMapRef = React.useRef<Record<string, number | null>>({})

  const [properties, setProperties] = React.useState<Array<{ id: number; address?: string }>>([])
  const [selectedProperties, setSelectedProperties] = React.useState<Record<number, { checked: boolean; accessId?: number; accessType?: string }>>({})

  const [displayName, setDisplayName] = React.useState<string>(userLabel ?? `#${userId}`)

  React.useEffect(() => {
    if (userLabel) setDisplayName(userLabel)
    else setDisplayName(`#${userId}`)
  }, [userId, userLabel])

  function deriveAvailableFromOptions(opts: any) {
    const av: Record<string, string[]> = {}
    const resLabels: Record<string, string> = {}
    const actLabels: Record<string, string> = {}

    const FALLBACK_RESOURCES = [
      { id: "client", label: "Clientes" },
      { id: "guard", label: "Guardias" },
      { id: "expense", label: "Gastos" },
      { id: "shift", label: "Turnos" },
    ]
    const FALLBACK_ACTIONS = ["create", "read", "update", "delete", "approve", "assign"]

    if (!opts) {
      FALLBACK_RESOURCES.forEach((r) => {
        av[r.id] = FALLBACK_ACTIONS.slice()
        resLabels[r.id] = r.label
      })
      return { av, resLabels, actLabels }
    }

    const resourcesArr = Array.isArray(opts.resource_types) ? opts.resource_types : []
    const actionsArr = Array.isArray(opts.actions) ? opts.actions : []

    if (resourcesArr.length > 0 && actionsArr.length > 0) {
      resourcesArr.forEach((r: any) => {
        const rv = String(r.value ?? r).toLowerCase()
        av[rv] = actionsArr.map((a: any) => String(a.value ?? a).toLowerCase())
        resLabels[rv] = String(r.label ?? r.value ?? rv)
      })
      actionsArr.forEach((a: any) => {
        const avv = String(a.value ?? a).toLowerCase()
        actLabels[avv] = String(a.label ?? a.value ?? avv)
      })
      return { av, resLabels, actLabels }
    }

    if (Array.isArray(opts)) {
      opts.forEach((it: any) => {
        if (typeof it === "string" && it.includes(".")) {
          const [sec, act] = it.split(".")
          const s = sec.toLowerCase()
          const a = act.toLowerCase()
          av[s] = av[s] ?? []
          if (!av[s].includes(a)) av[s].push(a)
        } else if (it && typeof it === "object") {
          const codename = it.codename || it.permission || it.code || ""
          if (typeof codename === "string" && codename.includes(".")) {
            const [sec, act] = codename.split(".")
            const s = sec.toLowerCase()
            const a = act.toLowerCase()
            av[s] = av[s] ?? []
            if (!av[s].includes(a)) av[s].push(a)
            resLabels[s] = String(it.resource_label ?? it.resource ?? s)
            actLabels[a] = String(it.action_label ?? it.action ?? a)
          } else if (it.resource && it.action) {
            const s = String(it.resource).toLowerCase()
            const a = String(it.action).toLowerCase()
            av[s] = av[s] ?? []
            if (!av[s].includes(a)) av[s].push(a)
            resLabels[s] = String(it.resource_label ?? it.resource ?? s)
            actLabels[a] = String(it.action_label ?? it.action ?? a)
          }
        }
      })
    }

    if (Object.keys(av).length === 0) {
      FALLBACK_RESOURCES.forEach((r) => {
        av[r.id] = ["create", "read", "update", "delete"]
        resLabels[r.id] = r.label
      })
    }

    return { av, resLabels, actLabels }
  }

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoadingOptions(true)
      setError(null)

      permissionIdMapRef.current = {}
      setPermissions({})
      setAvailableActions({})
      setResourceLabels({})
      setActionLabels({})
      setSelectedProperties({})
      setProperties([])

      try {
        const [optsRes, usersRes, propsRes] = await Promise.allSettled([
          listAdminAvailableOptions(),
          listUsersWithPermissions(),
          listProperties({ page_size: 200 }),
        ])

        if (!mounted) return

        const optsVal = optsRes.status === "fulfilled" ? optsRes.value : null
        const usersVal = usersRes.status === "fulfilled" ? usersRes.value : null
        const propsVal = propsRes.status === "fulfilled" ? propsRes.value : null

        const { av, resLabels, actLabels } = deriveAvailableFromOptions(optsVal)
        setAvailableActions(av)
        setResourceLabels(resLabels)
        setActionLabels(actLabels)

        const initialPermBooleans: UiPermissions = {}
        const initialPropMap: Record<number, { checked: boolean; accessId?: number; accessType?: string }> = {}

        if (usersVal && Array.isArray((usersVal as any).users)) {
          const found = (usersVal as any).users.find((u: any) => Number(u.id) === Number(userId))
          if (found) {
            if (!userLabel) {
              const uname = found.username ?? found.name ?? null
              if (uname) setDisplayName(uname)
            }

            if (Array.isArray(found.resource_permissions)) {
              found.resource_permissions.forEach((rp: any) => {
                const resource = String(rp.resource_type ?? rp.resource ?? "").toLowerCase()
                const action = String(rp.action ?? "").toLowerCase()
                if (!resource) return
                permissionIdMapRef.current[`${resource}.${action}`] = Number(rp.id ?? rp.permission_id ?? rp.pk ?? null) || null
                initialPermBooleans[resource] = initialPermBooleans[resource] ?? {}
                initialPermBooleans[resource][action] = true
              })
            }

            if (Array.isArray(found.property_access)) {
              found.property_access.forEach((pa: any) => {
                const pid = Number(pa.property_id ?? pa.property ?? pa.propertyId ?? NaN)
                if (Number.isNaN(pid)) return
                initialPropMap[pid] = {
                  checked: true,
                  accessId: Number(pa.id ?? pa.access_id ?? pa.pk ?? null) || undefined,
                  accessType: String(pa.access_type ?? pa.accessType ?? "viewer"),
                }
              })
            }
          }
        }

        const seed: UiPermissions = {}
        for (const [resKey, acts] of Object.entries(av)) {
          seed[resKey] = {}
          acts.forEach((a) => {
            seed[resKey][a] = Boolean(initialPermBooleans[resKey]?.[a] ?? false)
          })
        }

        setPermissions(seed)
        setSelectedProperties(initialPropMap)

        const items = Array.isArray(propsVal) ? propsVal : (propsVal?.results ?? [])
        const simple = items.map((p: any) => ({ id: p.id, address: p.address ?? p.name ?? String(p.id) }))
        setProperties(simple)
      } catch (err: any) {
        console.error("[UserPermissionsTable] load error", err)
        setError("Error cargando permisos/usuario")
      } finally {
        if (mounted) setLoadingOptions(false)
      }
    }

    void load()
    return () => { mounted = false }
  }, [userId, userLabel])

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
    setSelectedProperties((prev) => ({
      ...prev,
      [id]: { checked, accessId: prev?.[id]?.accessId, accessType: prev?.[id]?.accessType ?? "viewer" },
    }))
  }

  const setPropertyAccessType = (id: number, type: string) => {
    setSelectedProperties((prev) => ({
      ...prev,
      [id]: { checked: prev?.[id]?.checked ?? false, accessId: prev?.[id]?.accessId, accessType: type },
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const toGrant: Array<{ resource: string; action: string }> = []
      const toRevokeIds: number[] = []

      for (const [res, acts] of Object.entries(availableActions)) {
        for (const act of acts) {
          const key = `${res}.${act}`
          const checked = Boolean(permissions[res]?.[act])
          const existingId = permissionIdMapRef.current[key] ?? null
          if (checked && !existingId) {
            toGrant.push({ resource: res, action: act })
          } else if (!checked && existingId) {
            toRevokeIds.push(Number(existingId))
          }
        }
      }

      for (const g of toGrant) {
        try {
          const r = await grantResourcePermission(userId, g.resource, g.action, "Otorgado desde UI")
          const createdId = Number(r?.id ?? r?.permission_id ?? r?.pk ?? null)
          if (createdId) permissionIdMapRef.current[`${g.resource}.${g.action}`] = createdId
        } catch (err: any) {
          console.error("grantResourcePermission failed", err)
          setError("Error otorgando permisos (ver consola)")
          toast.error("Error otorgando permisos")
          setLoading(false)
          return
        }
      }

      for (const pid of toRevokeIds) {
        try {
          await revokeResourcePermissionById(pid, "Revocado desde UI")
          for (const k of Object.keys(permissionIdMapRef.current)) {
            if (permissionIdMapRef.current[k] === pid) permissionIdMapRef.current[k] = null
          }
        } catch (err: any) {
          console.error("revokeResourcePermissionById failed", err)
          setError("Error revocando permisos (ver consola)")
          toast.error("Error revocando permisos")
          setLoading(false)
          return
        }
      }

      const grants: Array<{ propertyId: number; accessType: string }> = []
      const revokes: number[] = []
      const updates: Array<{ accessId: number; propertyId: number; accessType: string }> = []

      for (const [pidStr, val] of Object.entries(selectedProperties)) {
        const pid = Number(pidStr)
        if (val.checked && !val.accessId) {
          grants.push({ propertyId: pid, accessType: val.accessType ?? "viewer" })
        } else if (!val.checked && val.accessId) {
          revokes.push(Number(val.accessId))
        } else if (val.checked && val.accessId) {
          updates.push({ accessId: Number(val.accessId), propertyId: pid, accessType: val.accessType ?? "viewer" })
        }
      }

      for (const g of grants) {
        try {
          const r = await grantPropertyAccess(userId, g.propertyId, g.accessType, undefined, "Otorgado desde UI")
          const createdId = Number(r?.id ?? r?.access_id ?? r?.pk ?? null)
          if (createdId) {
            setSelectedProperties((prev) => ({ ...(prev ?? {}), [g.propertyId]: { checked: true, accessId: createdId, accessType: g.accessType } }))
          }
        } catch (err: any) {
          console.error("grantPropertyAccess failed", err)
          setError("Error otorgando accesos a propiedades (ver consola)")
          toast.error("Error en accesos a propiedades")
          setLoading(false)
          return
        }
      }

      for (const u of updates) {
        try {
          await grantPropertyAccess(userId, u.propertyId, u.accessType, undefined, "Actualizado desde UI")
        } catch (err: any) {
          console.error("update property access failed", err)
          setError("Error actualizando accesos (ver consola)")
          toast.error("Error actualizando accesos")
          setLoading(false)
          return
        }
      }

      for (const aid of revokes) {
        try {
          await revokePropertyAccessById(aid, "Revocado desde UI")
          setSelectedProperties((prev) => {
            const copy = { ...(prev ?? {}) }
            for (const [kStr, v] of Object.entries(copy)) {
              if (v?.accessId === aid) {
                delete copy[Number(kStr)]
              }
            }
            return copy
          })
        } catch (err: any) {
          console.error("revokePropertyAccessById failed", err)
          setError("Error revocando accesos (ver consola)")
          toast.error("Error revocando accesos")
          setLoading(false)
          return
        }
      }

      toast.success("Cambios guardados correctamente")
      if (onUpdated) await onUpdated()
    } catch (err: any) {
      console.error("[UserPermissionsTable] save error", err)
      setError(String(err?.message ?? err))
      toast.error("Error guardando cambios")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Permisos del usuario {displayName}</h3>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              setLoadingOptions(true)
              try {
                const opts = await listAdminAvailableOptions()
                const { av, resLabels, actLabels } = deriveAvailableFromOptions(opts)
                setAvailableActions(av)
                setResourceLabels(resLabels)
                setActionLabels(actLabels)
                toast.success("Opciones recargadas")
              } catch (err) {
                console.error("refresh available options failed", err)
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
        <p>Cargando opciones y permisos…</p>
      ) : error ? (
        <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>
      ) : Object.keys(availableActions).length === 0 ? (
        <p>No hay opciones de permisos disponibles.</p>
      ) : (
        <div className="flex flex-col gap-4">
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
            <p className="text-xs text-muted-foreground mt-2">Los cambios se aplican con grant/revoke por resource/action usando los endpoints administrativos.</p>
          </div>

          <div className="border rounded p-2">
            <p className="font-semibold mb-2">Acceso a propiedades</p>
            {properties.length === 0 ? (
              <p className="text-sm">No se encontraron propiedades (o la ruta pública no respondió).</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-auto">
                {properties.map((p) => {
                  const sel = selectedProperties[p.id] ?? { checked: false, accessId: undefined, accessType: "viewer" }
                  return (
                    <div key={p.id} className="inline-flex items-center gap-2">
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={Boolean(sel.checked)} onChange={(e) => toggleProperty(p.id, e.target.checked)} />
                        <span className="text-sm">#{p.id} {p.address}</span>
                      </label>
                      <select value={sel.accessType} onChange={(e) => setPropertyAccessType(p.id, e.target.value)} disabled={!sel.checked} className="ml-2">
                        <option value="viewer">Visor</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                        <option value="full">Completo</option>
                      </select>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">Marcar para otorgar, desmarcar para revocar. El tipo de acceso se envía en la petición.</p>
          </div>
        </div>
      )}
    </div>
  )
}
