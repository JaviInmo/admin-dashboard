'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

import { createUser, type CreateUserPayload } from '@/lib/services/users'
import {
  listAdminAvailableOptions,
  listProperties,
  assignUserPermissions,
  grantPropertyAccess,
} from '@/lib/services/permissions'

type UiPermissions = Record<string, Record<string, boolean>>
type SelectedProperty = { checked: boolean; accessType?: string }

const FALLBACK_ACTIONS: Record<string, string[]> = {
  guard: ['read', 'update', 'delete', 'approve', 'assign'],
  expense: ['create', 'read', 'update', 'delete', 'approve', 'assign'],
  shift: ['create', 'read', 'update', 'delete', 'approve', 'assign'],
  client: ['create', 'read', 'update', 'delete', 'approve', 'assign'],
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: () => void | Promise<void>
}

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

export default function CreateUserDialog({ open, onClose, onCreated }: Props) {
  const [username, setUsername] = React.useState<string>('')
  const [firstName, setFirstName] = React.useState<string>('')
  const [lastName, setLastName] = React.useState<string>('')
  const [email, setEmail] = React.useState<string>('')
  const [password, setPassword] = React.useState<string>('')
  const [passwordConfirm, setPasswordConfirm] = React.useState<string>('')
  const [isActive, setIsActive] = React.useState<boolean>(true)
  const [isStaff, setIsStaff] = React.useState<boolean>(false)

  const [availableActions, setAvailableActions] = React.useState<Record<string, string[]>>({})
  const [resourceLabels, setResourceLabels] = React.useState<Record<string, string>>({})
  const [actionLabels, setActionLabels] = React.useState<Record<string, string>>({})
  const [permissions, setPermissions] = React.useState<UiPermissions>({})

  const [properties, setProperties] = React.useState<Array<{ id: number; address?: string }>>([])
  const [selectedProperties, setSelectedProperties] = React.useState<Record<number, SelectedProperty>>({})

  const [loading, setLoading] = React.useState<boolean>(false)
  const [loadingOptions, setLoadingOptions] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)

  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  React.useEffect(() => {
    if (!open) resetForm()
  }, [open])

  function resetForm() {
    setUsername('')
    setFirstName('')
    setLastName('')
    setEmail('')
    setPassword('')
    setPasswordConfirm('')
    setIsActive(true)
    setIsStaff(false)
    // reset permissions & properties (keep availableActions)
    setPermissions((prev) => {
      const seed: UiPermissions = {}
      for (const [res, acts] of Object.entries(prev ?? {})) {
        seed[res] = {}
        for (const a of Object.keys(acts)) seed[res][a] = false
      }
      return seed
    })
    setSelectedProperties({})
    setError(null)
  }

  React.useEffect(() => {
    if (!open) return
    let mounted = true

    const load = async () => {
      setLoadingOptions(true)
      setError(null)
      try {
        const [optsRes, propsRes] = await Promise.allSettled([
          listAdminAvailableOptions(),
          listProperties({ page_size: 200 }),
        ])
        if (!mounted) return

        const optsVal = optsRes.status === 'fulfilled' ? optsRes.value : null
        const propsVal = propsRes.status === 'fulfilled' ? propsRes.value : null

        const { av, resLabels, actLabels } = deriveAvailableFromOptions(optsVal)
        setAvailableActions(av)
        setResourceLabels(resLabels)
        setActionLabels(actLabels)

        // seed permissions all false
        const seed: UiPermissions = {}
        Object.entries(av).forEach(([res, acts]) => {
          seed[res] = {}
          acts.forEach((a) => {
            seed[res][a] = false
          })
        })
        setPermissions(seed)

        const items = Array.isArray(propsVal) ? propsVal : (propsVal?.results ?? [])
        const simple = items.map((p: any) => ({ id: p.id, address: p.address ?? p.name ?? String(p.id) }))
        setProperties(simple)
        setSelectedProperties({})
      } catch (err: unknown) {
        console.error('[CreateUserDialog] load options error', err)
        setAvailableActions(FALLBACK_ACTIONS as any)
        const seed: UiPermissions = {}
        Object.entries(FALLBACK_ACTIONS).forEach(([r, acts]) => {
          seed[r] = {}
          acts.forEach((a) => { seed[r][a] = false })
        })
        setPermissions(seed)
        setProperties([])
      } finally {
        if (mounted) setLoadingOptions(false)
      }
    }

    void load()
    return () => { mounted = false }
  }, [open])

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
      [id]: { checked, accessType: prev?.[id]?.accessType ?? 'viewer' },
    }))
  }

  const setPropertyAccessType = (id: number, type: string) => {
    setSelectedProperties((prev) => ({
      ...prev,
      [id]: { checked: prev?.[id]?.checked ?? false, accessType: type },
    }))
  }

  function validate(): string | null {
    if (!username.trim()) return 'Usuario es requerido'
    if (!firstName.trim()) return 'Nombre es requerido'
    if (!lastName.trim()) return 'Apellido es requerido'
    if (!email.trim()) return 'Email es requerido'
    if (email && !/\S+@\S+\.\S+/.test(email)) return 'Email inválido'
    if (!password) return 'Contraseña es requerida'
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres'
    if (password !== passwordConfirm) return 'Las contraseñas no coinciden'
    return null
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError(null)
    const v = validate()
    if (v) {
      setError(v)
      toast.error(v)
      return
    }

    setLoading(true)
    try {
      const payload: CreateUserPayload = {
        username: username.trim(),
        email: email.trim() !== '' ? email.trim() : undefined,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password,
        password_confirm: passwordConfirm,
        is_active: !!isActive,
        is_staff: !!isStaff,
      }

      if ((payload as any).user) delete (payload as any).user

      const created = await createUser(payload)

      // assign selected resource/action permissions
      const codenames = uiPermissionsToCodenames(permissions)
      if (codenames.length > 0) {
        try {
          await assignUserPermissions(created.id, codenames)
        } catch (errAssign: any) {
          // Non-fatal: report but continue
          console.error('Error assigning permissions on create:', errAssign)
          toast.error('Algunos permisos no pudieron asignarse (ver consola)')
        }
      }

      // grant property accesses
      const toGrant = Object.entries(selectedProperties)
        .filter(([_, v]) => (v as SelectedProperty).checked)
        .map(([k, v]) => ({ id: Number(k), access: v.accessType ?? 'viewer' }))

      for (const g of toGrant) {
        try {
          await grantPropertyAccess(created.id, g.id, g.access)
        } catch (errGrant: any) {
          console.error('Error granting property access', g, errGrant)
          toast.error(`No se pudo otorgar acceso a la propiedad #${g.id}`)
        }
      }

      toast.success('Usuario creado')
      if (mountedRef.current) {
        if (onCreated) await onCreated()
        onClose()
      }
      // reset handled by effect onOpen change or manually if needed
    } catch (err: any) {
      console.error('[CreateUserDialog] submit error', err)
      const data = err?.response?.data ?? err?.message ?? String(err)
      const msg = typeof data === 'object' ? JSON.stringify(data) : String(data)
      setError(msg)
      toast.error(msg)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Crear Usuario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4 max-h-[82vh] overflow-auto">
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <Input placeholder="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input placeholder="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>

          <Input placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />

          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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

          {/* Permisos */}
          <div className="border rounded p-2">
            <p className="font-semibold mb-2">Permisos por recurso</p>
            {loadingOptions && <p className="text-sm">Cargando opciones de permisos...</p>}
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
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-auto">
                {properties.map((p) => {
                  const sel = selectedProperties[p.id] ?? { checked: false, accessType: 'viewer' }
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
            <p className="text-xs text-muted-foreground mt-2">Marcar para otorgar. El tipo de acceso será enviado al backend.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => onClose()} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSubmit} className="ml-2" disabled={loading}>{loading ? 'Creando...' : 'Crear'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
