'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { User, Permissions } from '../types'
import { updateUser } from '@/lib/services/users'
import {
  listAdminAvailableOptions,
  listProperties,
  assignUserPermissions,
  grantPropertyAccess,
  revokePropertyAccess,
  revokeResourcePermission,
} from '@/lib/services/permissions'

type UiPermissions = Record<string, Record<string, boolean>>

const FALLBACK_ACTIONS: Record<string, string[]> = {
  guard: ['read', 'update', 'delete', 'approve', 'assign'],
  expense: ['create', 'read', 'update', 'delete', 'approve', 'assign'],
  shift: ['create', 'read', 'update', 'delete', 'approve', 'assign'],
  client: ['create', 'read', 'update', 'delete', 'approve', 'assign'],
}

interface Props {
  user: User & {
    permissions?: Permissions
    properties?: number[]
    property_access?: number[]
    accessible_properties?: number[]
    property_ids?: number[]
  }
  onClose: () => void
  onUpdated?: () => void | Promise<void>
}

export default function EditUserDialog({ user, onClose, onUpdated }: Props) {
  const splitName = (name?: string) => {
    const parts = name?.trim().split(' ').filter(Boolean) ?? []
    return {
      first: parts.slice(0, -1).join(' ') || parts[0] || '',
      last: parts.length > 1 ? parts[parts.length - 1] : '',
    }
  }

  const initialFirst = (user as any).firstName ?? splitName((user as any).name ?? user.username).first
  const initialLast = (user as any).lastName ?? splitName((user as any).name ?? user.username).last

  const [username] = React.useState<string>(user.username ?? '')
  const [firstName, setFirstName] = React.useState<string>(initialFirst ?? '')
  const [lastName, setLastName] = React.useState<string>(initialLast ?? '')
  const [email, setEmail] = React.useState<string>(user.email ?? '')

  // normalize boolean fields reading both snake_case and camelCase from server/user
  const readUserBool = (snake: string, camel: string, fallback = true): boolean => {
    const anyUser = user as any
    if (anyUser[snake] !== undefined) return Boolean(anyUser[snake])
    if (anyUser[camel] !== undefined) return Boolean(anyUser[camel])
    return fallback
  }

  const [isActive, setIsActive] = React.useState<boolean>(readUserBool('is_active', 'isActive', true))
  const [isStaff, setIsStaff] = React.useState<boolean>(readUserBool('is_staff', 'isStaff', false))

  const [availableActions, setAvailableActions] = React.useState<Record<string, string[]>>({})
  const [resourceLabels, setResourceLabels] = React.useState<Record<string, string>>({})
  const [actionLabels, setActionLabels] = React.useState<Record<string, string>>({})
  const [permissions, setPermissions] = React.useState<UiPermissions>({})

  const [properties, setProperties] = React.useState<Array<{ id: number; address?: string }>>([])
  const [selectedProperties, setSelectedProperties] = React.useState<Record<number, boolean>>({})

  const [rawAvailableOptions, setRawAvailableOptions] = React.useState<any>(null)
  const [rawProperties, setRawProperties] = React.useState<any>(null)

  const [userRoles, setUserRoles] = React.useState<Array<{ value: string; label: string }>>([])
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null)

  const [loading, setLoading] = React.useState<boolean>(false)
  const [loadingPermissions, setIsLoadingPermissions] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)

  // Refs para diffing (estado inicial)
  const initialCodenamesRef = React.useRef<Set<string>>(new Set())
  const initialSelectedPropertiesRef = React.useRef<Set<number>>(new Set())

  React.useEffect(() => {
    setFirstName((user as any).firstName ?? splitName((user as any).name ?? user.username).first)
    setLastName((user as any).lastName ?? splitName((user as any).name ?? user.username).last)
    setEmail(user.email ?? '')
    setIsActive(readUserBool('is_active', 'isActive', true))
    setIsStaff(readUserBool('is_staff', 'isStaff', false))
  }, [user])

  // extrae IDs de propiedades que el user ya tiene
  const initialPropertyIdsFromUser = (): number[] => {
    const maybe = (user as any).properties ?? (user as any).property_access ?? (user as any).accessible_properties ?? (user as any).property_ids
    if (Array.isArray(maybe)) return maybe.map((v: any) => Number(v)).filter(Boolean)
    return []
  }

  // helper para sacar codenames desde UI permissions
  const getCodenamesFromPermissions = (ui: UiPermissions) => {
    const out: string[] = []
    for (const [res, actions] of Object.entries(ui)) {
      for (const [act, en] of Object.entries(actions)) {
        if (!en) continue
        out.push(`${res.toLowerCase()}.${act.toLowerCase()}`)
      }
    }
    return out
  }

  // Construye estado UI a partir de available_options + pre-puebla desde user.permissions si existe.
  const buildFromAvailableOptions = (opts: any, initialPermissionsFromUser?: Permissions) => {
    if (!opts) {
      // fallback: FALLBACK_ACTIONS
      const av = FALLBACK_ACTIONS
      setAvailableActions(av)
      setResourceLabels({})
      setActionLabels({})

      const seed: UiPermissions = {}
      for (const [res, acts] of Object.entries(av)) {
        seed[res] = {}
        for (const a of acts) {
          let value = false
          if (initialPermissionsFromUser) {
            const tryKeys = [res, res === 'client' ? 'cliente' : null, res === 'guard' ? 'guardia' : null].filter(Boolean) as string[]
            for (const k of tryKeys) {
              const section = (initialPermissionsFromUser as any)[k]
              if (section && typeof section === 'object') {
                // construimos lista segura de claves candidatas (evitamos undefined)
                const candidateKeys = [a, a === 'update' ? 'edit' : null, a === 'edit' ? 'update' : null].filter(Boolean) as string[]
                for (const ck of candidateKeys) {
                  if ((section as any)[ck] !== undefined) {
                    value = Boolean((section as any)[ck])
                    if (value) break
                  }
                }
                if (value) break
              }
            }
          }
          seed[res][a] = value
        }
      }
      setPermissions(seed)
      initialCodenamesRef.current = new Set(getCodenamesFromPermissions(seed))
      return
    }

    // user_roles
    if (Array.isArray(opts.user_roles)) {
      setUserRoles(opts.user_roles.map((r: any) => ({ value: String(r.value), label: String(r.label) })))
    }

    const resourcesArr = Array.isArray(opts.resource_types) ? opts.resource_types : []
    const actionsArr = Array.isArray(opts.actions) ? opts.actions : []

    const resLabels: Record<string, string> = {}
    resourcesArr.forEach((r: any) => {
      const v = String(r.value).toLowerCase()
      resLabels[v] = String(r.label ?? r.value ?? v)
    })
    const actLabels: Record<string, string> = {}
    actionsArr.forEach((a: any) => {
      const v = String(a.value).toLowerCase()
      actLabels[v] = String(a.label ?? a.value ?? v)
    })
    setResourceLabels(resLabels)
    setActionLabels(actLabels)

    const av: Record<string, string[]> = {}
    resourcesArr.forEach((r: any) => {
      const rv = String(r.value).toLowerCase()
      av[rv] = actionsArr.map((a: any) => String(a.value).toLowerCase())
    })
    setAvailableActions(av)

    // Prepopulate permissions using user.permissions if present
    const seed: UiPermissions = {}
    for (const [res, acts] of Object.entries(av)) {
      seed[res] = {}
      for (const a of acts) {
        let val = false
        const permsSrc = initialPermissionsFromUser ?? (user as any).permissions
        if (permsSrc) {
          const tryKeys = [res, res === 'client' ? 'cliente' : null, res === 'guard' ? 'guardia' : null].filter(Boolean) as string[]
          for (const k of tryKeys) {
            const section = (permsSrc as any)[k]
            if (section && typeof section === 'object') {
              // construimos lista de claves candidatas (evitamos crear 'undefined' como índice)
              const candidateKeys = [a, a === 'update' ? 'edit' : null, a === 'edit' ? 'update' : null].filter(Boolean) as string[]
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
    initialCodenamesRef.current = new Set(getCodenamesFromPermissions(seed))
  }

  React.useEffect(() => {
    if (!open) return
    let mounted = true
    const load = async () => {
      setIsLoadingPermissions(true)
      try {
        const opts = await listAdminAvailableOptions()
        if (!mounted) return
        setRawAvailableOptions(opts)
        buildFromAvailableOptions(opts, (user as any).permissions)

        const props = await listProperties({ page_size: 200 })
        if (!mounted) return
        setRawProperties(props)
        const items = Array.isArray(props) ? props : (props?.results ?? [])
        const simple = items.map((p: any) => ({ id: p.id, address: p.address ?? p.name ?? String(p.id) }))
        setProperties(simple)

        const initialProps = initialPropertyIdsFromUser()
        if (initialProps.length > 0) {
          const map: Record<number, boolean> = {}
          initialProps.forEach((id) => { map[Number(id)] = true })
          setSelectedProperties(map)
          initialSelectedPropertiesRef.current = new Set(initialProps.map((n) => Number(n)))
        } else {
          setSelectedProperties({})
          initialSelectedPropertiesRef.current = new Set()
        }
      } catch (err: unknown) {
        console.error('[EditUserDialog] load options error', err)
        buildFromAvailableOptions(null, (user as any).permissions)
      } finally {
        if (mounted) setIsLoadingPermissions(false)
      }
    }
    void load()
    return () => { mounted = false }
  }, [open, user])

  // handlers
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

  const handleSubmit = async () => {
    setError(null)
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      setError('Correo inválido')
      return
    }
    setLoading(true)
    try {
      const payload: Record<string, any> = {
        email: email?.trim() ?? null,
        first_name: firstName?.trim() ?? '',
        last_name: lastName?.trim() ?? '',
        is_active: !!isActive,
        is_staff: !!isStaff,
      }
      await updateUser(user.id, payload)

      // diffs resource permissions
      const currentCodenames = new Set(uiPermissionsToCodenames(permissions))
      const initialCodenames = new Set(initialCodenamesRef.current)
      const added = Array.from(currentCodenames).filter((c) => !initialCodenames.has(c))
      const removed = Array.from(initialCodenames).filter((c) => !currentCodenames.has(c))

      if (added.length > 0) {
        try { await assignUserPermissions(user.id, added) }
        catch (errAssign: unknown) { console.error('Error asignando permisos añadidos:', errAssign) }
      }

      if (removed.length > 0) {
        const revokePromises = removed.map((codename) =>
          revokeResourcePermission(user.id, codename).catch((err) => {
            console.error('revokeResourcePermission failed for', codename, err)
            return null
          })
        )
        await Promise.allSettled(revokePromises)
      }

      // properties: grant + revoke
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
          grantPropertyAccess(user.id, pid).catch((err) => {
            console.error('grantPropertyAccess failed for', pid, err)
            return null
          })
        )
        await Promise.allSettled(grantPromises)
      }

      if (revokeIds.length > 0) {
        const revokePropPromises = revokeIds.map((pid) =>
          revokePropertyAccess(user.id, pid).catch((err) => {
            console.error('revokePropertyAccess failed for', pid, err)
            return null
          })
        )
        await Promise.allSettled(revokePropPromises)
      }

      if (onUpdated) await onUpdated()
      onClose()
    } catch (err: unknown) {
      const e = err as any
      const data = e?.response?.data
      if (data) {
        if (typeof data === 'string') setError(String(data))
        else if (data.detail) setError(String(data.detail))
        else if (data.email) setError(String(data.email))
        else setError(JSON.stringify(data))
      } else {
        setError('Error actualizando usuario')
      }
      console.error('[EditUserDialog] submit error', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-3xl max-h-[80vh] overflow-hidden">
        <DialogHeader><DialogTitle>Editar Usuario</DialogTitle></DialogHeader>

        <div className="space-y-4 p-4 max-h-[70vh] overflow-auto">
          <Input placeholder="Username" value={username} disabled />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>

          <Input placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span>Activo</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={isStaff} onChange={(e) => setIsStaff(e.target.checked)} />
              <span>Staff</span>
            </label>
          </div>

          {/* Role selector if backend provides user_roles */}
          {userRoles.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select value={selectedRole ?? ''} onChange={(e) => setSelectedRole(e.target.value || null)} className="border rounded px-2 py-1">
                <option value="">(ninguno)</option>
                {userRoles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <p className="text-xs text-muted-foreground mt-1">Selecciona un rol (si aplica en tu backend)</p>
            </div>
          )}

          {/* Permisos por recurso */}
          <div className="border rounded p-2">
            <p className="font-semibold mb-2">Permisos por recurso</p>
            {loadingPermissions && <p className="text-sm">Cargando opciones de permisos...</p>}
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
            <p className="text-xs text-muted-foreground mt-2">Permisos enviados como <code>resource.action</code> (ej. <code>guard.read</code>).</p>
          </div>

          {/* Propiedades */}
          <div className="border rounded p-2">
            <p className="font-semibold mb-2">Acceso a propiedades</p>
            {properties.length === 0 ? (
              <p className="text-sm">No se encontraron propiedades (o falló la carga).</p>
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
            <p className="text-xs text-muted-foreground mt-2">Cada propiedad marcada llamará a <code>grant_property_access/</code>. Las desmarcadas llamarán a <code>revoke_property_access/</code>.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* debug raw */}
          {rawAvailableOptions && (
            <div className="mt-2 border rounded p-2 bg-gray-50">
              <p className="font-medium">Raw available_options (debug)</p>
              <pre className="text-xs max-h-40 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(rawAvailableOptions, null, 2)}</pre>
            </div>
          )}
          {rawProperties && (
            <div className="mt-2 border rounded p-2 bg-gray-50">
              <p className="font-medium">Raw properties (debug)</p>
              <pre className="text-xs max-h-40 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify(rawProperties, null, 2)}</pre>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => onClose()} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSubmit} className="ml-2" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
