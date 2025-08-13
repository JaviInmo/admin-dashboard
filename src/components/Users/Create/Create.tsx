// src/components/Users/Create/Create.tsx
'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createUser } from '@/lib/services/users'
import {
  listAdminAvailableOptions,
  listProperties,
  assignUserPermissions,
  grantPropertyAccess,
} from '@/lib/services/permissions'

type UiPermissions = Record<string, Record<string, boolean>>

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

export default function CreateUserDialog({ open, onClose, onCreated }: Props) {
  // campos básicos
  const [username, setUsername] = React.useState<string>('')
  const [firstName, setFirstName] = React.useState<string>('')
  const [lastName, setLastName] = React.useState<string>('')
  const [email, setEmail] = React.useState<string>('')
  const [password, setPassword] = React.useState<string>('')
  const [passwordConfirm, setPasswordConfirm] = React.useState<string>('')
  const [isActive, setIsActive] = React.useState<boolean>(true)
  const [isStaff, setIsStaff] = React.useState<boolean>(false)

  // permisos construidos desde available_options
  const [availableActions, setAvailableActions] = React.useState<Record<string, string[]>>({})
  const [resourceLabels, setResourceLabels] = React.useState<Record<string, string>>({})
  const [actionLabels, setActionLabels] = React.useState<Record<string, string>>({})
  const [permissions, setPermissions] = React.useState<UiPermissions>({})

  // roles (user_roles)
  const [userRoles, setUserRoles] = React.useState<Array<{ value: string; label: string }>>([])
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null)

  // properties to grant access
  const [properties, setProperties] = React.useState<Array<{ id: number; address?: string }>>([])
  const [selectedProperties, setSelectedProperties] = React.useState<Record<number, boolean>>({})

  // loading / errors
  const [loading, setLoading] = React.useState<boolean>(false)
  const [loadingPermissions, setIsLoadingPermissions] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      // reset
      setUsername(''); setFirstName(''); setLastName('')
      setEmail(''); setPassword(''); setPasswordConfirm('')
      setIsActive(true); setIsStaff(false)
      setAvailableActions({}); setResourceLabels({}); setActionLabels({})
      setPermissions({})
      setUserRoles([]); setSelectedRole(null)
      setProperties([]); setSelectedProperties({})
      setError(null)
    }
  }, [open])

  const buildFromAvailableOptions = (opts: any) => {
    if (!opts) return
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

    setPermissions(prev => {
      const merged: UiPermissions = {}
      for (const [res, acts] of Object.entries(av)) {
        merged[res] = {}
        for (const a of acts) merged[res][a] = prev?.[res]?.[a] ?? false
      }
      return merged
    })
  }

  React.useEffect(() => {
    if (!open) return
    let mounted = true

    const load = async () => {
      setIsLoadingPermissions(true)
      try {
        const opts = await listAdminAvailableOptions()
        if (!mounted) return
        buildFromAvailableOptions(opts)

        const props = await listProperties({ page_size: 200 })
        if (!mounted) return
        const items = Array.isArray(props) ? props : (props?.results ?? [])
        const simple = items.map((p: any) => ({ id: p.id, address: p.address ?? p.name ?? String(p.id) }))
        setProperties(simple)
        setSelectedProperties({})
      } catch {
        // silencioso: si falla la carga de opciones/properties, dejamos fallbacks vacíos
      } finally {
        if (mounted) setIsLoadingPermissions(false)
      }
    }

    void load()
    return () => { mounted = false }
  }, [open])

  const handleToggle = (resource: string, action: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [resource]: {
        ...(prev?.[resource] ?? {}),
        [action]: checked,
      },
    }))
  }

  const toggleProperty = (id: number, checked: boolean) => {
    setSelectedProperties(prev => ({ ...prev, [id]: checked }))
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
    if (!username.trim()) { setError('Username es requerido'); return }
    if (!password || password.length < 8) { setError('Password mínimo 8 caracteres'); return }

    setLoading(true)
    try {
      const created = await createUser({
        username: username.trim(),
        email: email.trim() || undefined,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        password,
        password_confirm: passwordConfirm || undefined,
        is_active: isActive,
        is_staff: isStaff,
      })

      const codenames = uiPermissionsToCodenames(permissions)
      if (codenames.length > 0) {
        try { await assignUserPermissions(created.id, codenames) }
        catch { /* ignorar fallo de asignación de permisos aquí */ }
      }

      const selectedIds = Object.entries(selectedProperties).filter(([_, v]) => v).map(([k]) => Number(k))
      if (selectedIds.length > 0) {
        for (const pid of selectedIds) {
          try { await grantPropertyAccess(created.id, pid) }
          catch { /* ignorar fallo de grant property aquí */ }
        }
      }

      onCreated?.()
      onClose()
    } catch (err: unknown) {
      const e = err as any
      const data = e?.response?.data
      if (data) {
        if (typeof data === 'string') setError(data)
        else if (data.detail) setError(String(data.detail))
        else if (data.username) setError(String(data.username))
        else if (data.password) setError(String(data.password))
        else setError(JSON.stringify(data))
      } else {
        setError('Error creando usuario')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* DialogContent: max size + ocultar overflow de página */}
     <DialogContent className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader><DialogTitle>Crear Usuario</DialogTitle></DialogHeader>

        {/* Contenedor scrollable principal (vertical) */}
        <div className="space-y-4 p-4 max-h-[70vh] overflow-auto">
          {/* Inputs */}
          <Input placeholder="Username (requerido)" value={username} onChange={(e) => setUsername(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <Input placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Contraseña (min 8)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input placeholder="Confirmar contraseña" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
          </div>

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

          {/* Role selector */}
          {userRoles.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={selectedRole ?? ''}
                onChange={(e) => setSelectedRole(e.target.value || null)}
                className="border rounded px-2 py-1"
              >
                <option value="">(ninguno)</option>
                {userRoles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          )}

          {/* Permisos por recurso: actions en fila scrollable horizontal */}
          <div className="border rounded p-2">
            <p className="font-semibold mb-2">Permisos por recurso</p>

            {loadingPermissions && <p className="text-sm">Cargando opciones de permisos...</p>}

            {Object.entries(availableActions).map(([res, acts]) => (
              <div key={res} className="mb-3">
                <p className="capitalize font-medium mb-1">{resourceLabels[res] ?? res}</p>

                {/* fila scroll horizontal */}
                <div className="overflow-x-auto whitespace-nowrap py-1">
                  {acts.map(act => (
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

            <p className="text-xs text-muted-foreground mt-2">Se enviarán permisos como codenames: <code>resource.action</code>.</p>
          </div>

          {/* Propiedades (grid vertical con scroll) */}
          <div className="border rounded p-2">
            <p className="font-semibold mb-2">Acceso a propiedades</p>

            {properties.length === 0 ? (
              <p className="text-sm">No se encontraron propiedades (o falló la carga).</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-44 overflow-auto">
                {properties.map(p => (
                  <label key={p.id} className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(selectedProperties[p.id])} onChange={(e) => toggleProperty(p.id, e.target.checked)} />
                    <span className="text-sm">#{p.id} {p.address}</span>
                  </label>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">Cada propiedad marcada llamará a <code>grant_property_access/</code>.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* acciones */}
          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => onClose()} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSubmit} className="ml-2" disabled={loading}>{loading ? 'Creando...' : 'Crear'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
