'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { User } from '../types'
import { updateUser } from '@/lib/services/users'
import {
  listAdminAvailableOptions,
  listUsersWithPermissions,
  listProperties,
  assignUserPermissions,
  grantPropertyAccess,
  revokePropertyAccess as revokePropertyAccessCompat,
  revokeResourcePermission as revokeResourcePermissionCompat,
} from '@/lib/services/permissions'
import { toast } from 'sonner'

type UiPermissions = Record<string, Record<string, boolean>>

const FALLBACK_ACTIONS: Record<string, string[]> = {
  guard: ['read', 'update', 'delete', 'approve', 'assign'],
  expense: ['create', 'read', 'update', 'delete', 'approve', 'assign'],
  shift: ['create', 'read', 'update', 'delete', 'approve', 'assign'],
  client: ['create', 'read', 'update', 'delete', 'approve', 'assign'],
}

interface Props {
  user: User & {
    permissions?: any
    properties?: number[]
    property_access?: any[]
    accessible_properties?: number[]
    property_ids?: number[]
  }
  onClose: () => void
  onUpdated?: () => void | Promise<void>
}

type SelectedProperty = { checked: boolean; accessId?: number; accessType?: string }

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
  const [selectedProperties, setSelectedProperties] = React.useState<Record<number, SelectedProperty>>({})

  const [loading, setLoading] = React.useState<boolean>(false)
  const [loadingPermissions, setIsLoadingPermissions] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)

  const initialCodenamesRef = React.useRef<Set<string>>(new Set())
  const initialSelectedPropertiesRef = React.useRef<Set<number>>(new Set())
  const permissionIdMapRef = React.useRef<Record<string, number | null>>({})

  function deriveAvailableFromOptions(opts: any) {
    const av: Record<string, string[]> = {}
    const resLabels: Record<string, string> = {}
    const actLabels: Record<string, string> = {}

    if (!opts) {
      Object.entries(FALLBACK_ACTIONS).forEach(([res, acts]) => {
        av[res] = acts.slice()
        resLabels[res] = res
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
        if (typeof it === 'string' && it.includes('.')) {
          const [sec, act] = it.split('.')
          const s = sec.toLowerCase()
          const a = act.toLowerCase()
          av[s] = av[s] ?? []
          if (!av[s].includes(a)) av[s].push(a)
        } else if (it && typeof it === 'object') {
          const codename = it.codename || it.permission || it.code || ''
          if (typeof codename === 'string' && codename.includes('.')) {
            const [sec, act] = codename.split('.')
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
      Object.entries(FALLBACK_ACTIONS).forEach(([res, acts]) => {
        av[res] = acts.slice()
        resLabels[res] = res
      })
    }

    return { av, resLabels, actLabels }
  }

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

  React.useEffect(() => {
    if (!user || !user.id) return
    let mounted = true

    const load = async () => {
      setIsLoadingPermissions(true)
      setError(null)

      permissionIdMapRef.current = {}
      initialCodenamesRef.current = new Set()
      initialSelectedPropertiesRef.current = new Set()
      setPermissions({})
      setAvailableActions({})
      setResourceLabels({})
      setActionLabels({})
      setSelectedProperties({})
      setProperties([])

      try {
        const [optsRes, usersWithPermRes, propsRes] = await Promise.allSettled([
          listAdminAvailableOptions(),
          listUsersWithPermissions(),
          listProperties({ page_size: 200 }),
        ])

        if (!mounted) return

        const optsVal = optsRes.status === 'fulfilled' ? optsRes.value : null
        const usersVal = usersWithPermRes.status === 'fulfilled' ? usersWithPermRes.value : null
        const propsVal = propsRes.status === 'fulfilled' ? propsRes.value : null

        const { av, resLabels, actLabels } = deriveAvailableFromOptions(optsVal)
        setAvailableActions(av)
        setResourceLabels(resLabels)
        setActionLabels(actLabels)

        const initialPermBooleans: UiPermissions = {}
        const initialPropMap: Record<number, SelectedProperty> = {}

        if (usersVal && Array.isArray((usersVal as any).users)) {
          const found = (usersVal as any).users.find((u: any) => Number(u.id) === Number(user.id))
          if (found) {
            if (Array.isArray(found.resource_permissions)) {
              found.resource_permissions.forEach((rp: any) => {
                const resource = String(rp.resource_type ?? rp.resource ?? '').toLowerCase()
                const action = String(rp.action ?? '').toLowerCase()
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
                  accessType: String(pa.access_type ?? pa.accessType ?? 'viewer'),
                }
                initialSelectedPropertiesRef.current.add(pid)
              })
            }
          }
        }

        if (Object.keys(initialPermBooleans).length === 0) {
          const permsSrc = (user as any).permissions ?? (user as any).resource_permissions ?? null
          if (permsSrc) {
            if (!Array.isArray(permsSrc) && typeof permsSrc === 'object') {
              for (const [sec, obj] of Object.entries(permsSrc)) {
                const s = String(sec).toLowerCase()
                initialPermBooleans[s] = initialPermBooleans[s] ?? {}
                if (obj && typeof obj === 'object') {
                  for (const [k, v] of Object.entries(obj as any)) {
                    initialPermBooleans[s][String(k).toLowerCase()] = Boolean(v)
                  }
                }
              }
            } else if (Array.isArray(permsSrc)) {
              permsSrc.forEach((it: any) => {
                if (typeof it === 'string' && it.includes('.')) {
                  const [s, a] = it.split('.')
                  initialPermBooleans[s] = initialPermBooleans[s] ?? {}
                  initialPermBooleans[s][a] = true
                } else if (it && typeof it === 'object') {
                  const codename = it.codename || it.permission || ''
                  if (typeof codename === 'string' && codename.includes('.')) {
                    const [s, a] = codename.split('.')
                    initialPermBooleans[s] = initialPermBooleans[s] ?? {}
                    initialPermBooleans[s][a] = true
                  }
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
        initialCodenamesRef.current = new Set(getCodenamesFromPermissions(seed))
        setSelectedProperties(initialPropMap)

        const items = Array.isArray(propsVal) ? propsVal : (propsVal?.results ?? [])
        const simple = items.map((p: any) => ({ id: p.id, address: p.address ?? p.name ?? String(p.id) }))
        setProperties(simple)
      } catch (err: unknown) {
        console.error('[EditUserDialog] load options error', err)
        setAvailableActions(FALLBACK_ACTIONS as any)
        const seed: UiPermissions = {}
        Object.entries(FALLBACK_ACTIONS).forEach(([r, acts]) => {
          seed[r] = {}
          acts.forEach((a) => { seed[r][a] = false })
        })
        setPermissions(seed)
        initialCodenamesRef.current = new Set()
      } finally {
        if (mounted) setIsLoadingPermissions(false)
      }
    }

    void load()
    return () => { mounted = false }
  }, [user])

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
      [id]: { checked, accessId: prev?.[id]?.accessId, accessType: prev?.[id]?.accessType ?? 'viewer' },
    }))
  }

  const setPropertyAccessType = (id: number, type: string) => {
    setSelectedProperties((prev) => ({
      ...prev,
      [id]: { checked: prev?.[id]?.checked ?? false, accessId: prev?.[id]?.accessId, accessType: type },
    }))
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

      const currentCodenames = new Set(uiPermissionsToCodenames(permissions))
      const initialCodenames = new Set(initialCodenamesRef.current)
      const added = Array.from(currentCodenames).filter((c) => !initialCodenames.has(c))
      const removed = Array.from(initialCodenames).filter((c) => !currentCodenames.has(c))

      if (added.length > 0) {
        try { await assignUserPermissions(user.id, added) }
        catch (errAssign: unknown) { console.error('Error asignando permisos añadidos:', errAssign) }
      }

      if (removed.length > 0) {
        for (const codename of removed) {
          try {
            await revokeResourcePermissionCompat(user.id, codename)
          } catch (err) {
            console.error('Error revocando codename', codename, err)
          }
        }
      }

      const currentSelectedIds = new Set(
        Object.entries(selectedProperties)
          .filter(([_, v]) => (v as SelectedProperty).checked)
          .map(([k]) => Number(k))
      )
      const initialSelected = new Set(initialSelectedPropertiesRef.current)

      const grantIds = Array.from(currentSelectedIds).filter((id) => !initialSelected.has(id))
      const revokeIds = Array.from(initialSelected).filter((id) => !currentSelectedIds.has(id))

      for (const pid of grantIds) {
        try {
          const sp = selectedProperties[pid]
          await grantPropertyAccess(user.id, pid, sp?.accessType ?? 'viewer')
        } catch (err) {
          console.error('grantPropertyAccess failed for', pid, err)
        }
      }

      for (const pid of revokeIds) {
        try {
          await revokePropertyAccessCompat(user.id, pid)
        } catch (err) {
          console.error('revokePropertyAccess failed for', pid, err)
        }
      }

      if (onUpdated) await onUpdated()
      toast.success('Usuario actualizado')
      onClose()
    } catch (err: unknown) {
      const e = err as any
      const data = e?.response?.data
      if (data) {
        if (typeof data === 'string') setError(String(data))
        else if (data.detail) setError(String(data.detail))
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
      <DialogContent className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader><DialogTitle>Editar Usuario</DialogTitle></DialogHeader>

        <div className="space-y-4 p-4 max-h-[82vh] overflow-auto">
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Username" value={username} disabled />
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

          {/* ====== Permisos arriba (stack) ====== */}
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

          {/* ====== Propiedades debajo ====== */}
          <div className="border rounded p-2">
            <p className="font-semibold mb-2">Acceso a propiedades</p>
            {properties.length === 0 ? (
              <p className="text-sm">No se encontraron propiedades (o falló la carga).</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-auto">
                {properties.map((p) => {
                  const sel = selectedProperties[p.id] ?? { checked: false, accessId: undefined, accessType: 'viewer' }
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
            <p className="text-xs text-muted-foreground mt-2">Marcar para otorgar, desmarcar para revocar.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => onClose()} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSubmit} className="ml-2" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
