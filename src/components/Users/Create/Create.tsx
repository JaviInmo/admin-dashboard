"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Permissions } from "../types"
import { createUser } from "@/lib/services/users"

const emptyPermissions: Permissions = {
  cliente: { create: false, edit: false, read: false, delete: false },
  guardia: { create: false, edit: false, read: false, delete: false },
  ubicacion: { create: false, edit: false, read: false, delete: false },
  dashboard: { create: false, edit: false, read: false, delete: false },
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

export default function CreateUserDialog({ open, onClose, onCreated }: Props) {
  const [username, setUsername] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [passwordConfirm, setPasswordConfirm] = React.useState("")
  const [isActive, setIsActive] = React.useState(true)
  const [isStaff, setIsStaff] = React.useState(false)
  const [permissions, setPermissions] = React.useState<Permissions>(emptyPermissions)

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const reset = () => {
    setUsername("")
    setFirstName("")
    setLastName("")
    setEmail("")
    setPassword("")
    setPasswordConfirm("")
    setIsActive(true)
    setIsStaff(false)
    setPermissions(emptyPermissions)
    setError(null)
    setLoading(false)
  }

  React.useEffect(() => {
    if (!open) reset()
  }, [open])

  const handleSubmit = async () => {
    setError(null)

    if (!username.trim()) {
      setError("Username es requerido")
      return
    }
    if (!password || password.length < 8) {
      setError("Password mínimo 8 caracteres")
      return
    }

    setLoading(true)
    try {
      await createUser({
        username: username.trim(),
        email: email.trim() || undefined,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        password,
        password_confirm: passwordConfirm || undefined,
        is_active: isActive,
        is_staff: isStaff,
      })

      // Si necesitas guardar `permissions` en otro endpoint, aquí es donde llamarlo.
      onCreated?.()
      onClose()
    } catch (err: any) {
      // Intenta extraer mensajes comunes del backend
      const data = err?.response?.data
      if (data) {
        if (typeof data === "string") setError(data)
        else if (data.detail) setError(String(data.detail))
        else if (data.username) setError(String(data.username))
        else if (data.password) setError(String(data.password))
        else setError(JSON.stringify(data))
      } else {
        setError("Error creando usuario")
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Usuario</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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

          <div className="border rounded p-2">
            <p className="font-semibold mb-2">Permisos (solo UI)</p>
            {Object.keys(permissions).map((section) => (
              <div key={section} className="mb-2">
                <p className="capitalize font-medium">{section}</p>
                {Object.keys(permissions[section as keyof Permissions]).map((action) => (
                  <label key={action} className="mr-2 inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={permissions[section as keyof Permissions][action as keyof Permissions["cliente"]]}
                      onChange={(e) =>
                        setPermissions({
                          ...permissions,
                          [section]: {
                            ...permissions[section as keyof Permissions],
                            [action]: e.target.checked
                          }
                        })
                      }
                    />
                    <span className="text-sm">{action}</span>
                  </label>
                ))}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Los permisos no se envían al backend por defecto.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => { reset(); onClose() }} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSubmit} className="ml-2" disabled={loading}>
              {loading ? "Creando..." : "Crear"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
