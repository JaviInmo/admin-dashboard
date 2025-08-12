"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { User, Permissions } from "../types"
import { updateUser } from "@/lib/services/users"

const emptyPermissions: Permissions = {
  cliente: { create: false, edit: false, read: false, delete: false },
  guardia: { create: false, edit: false, read: false, delete: false },
  ubicacion: { create: false, edit: false, read: false, delete: false },
  dashboard: { create: false, edit: false, read: false, delete: false },
}

interface Props {
  user: User & { permissions?: Permissions }
  onClose: () => void
  onUpdated?: () => void | Promise<void>
}

export default function EditUserDialog({ user, onClose, onUpdated }: Props) {
  // Inicializadores: preferimos firstName/lastName si vienen; si no, intentamos derivar desde name
  const splitName = (name?: string) => {
    const parts = name?.trim().split(" ").filter(Boolean) ?? []
    return {
      first: parts.slice(0, -1).join(" ") || parts[0] || "",
      last: parts.length > 1 ? parts[parts.length - 1] : "",
    }
  }

  const initialFirst = user.firstName ?? splitName(user.name).first
  const initialLast = user.lastName ?? splitName(user.name).last

  const [username] = React.useState(user.username ?? "") // readonly by default
  const [firstName, setFirstName] = React.useState(initialFirst ?? "")
  const [lastName, setLastName] = React.useState(initialLast ?? "")
  const [email, setEmail] = React.useState(user.email ?? "")
  const [isActive, setIsActive] = React.useState<boolean>(user.isActive ?? true)
  const [isStaff, setIsStaff] = React.useState<boolean>(user.isStaff ?? false)
  const [permissions, setPermissions] = React.useState<Permissions>(user.permissions || emptyPermissions)

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // If the `user` prop changes while dialog is open, reflect it
  React.useEffect(() => {
    setFirstName(user.firstName ?? splitName(user.name).first)
    setLastName(user.lastName ?? splitName(user.name).last)
    setEmail(user.email ?? "")
    setIsActive(user.isActive ?? true)
    setIsStaff(user.isStaff ?? false)
    setPermissions(user.permissions ?? emptyPermissions)
  }, [user])

  const handleSubmit = async () => {
    setError(null)

    // Validaciones básicas
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      setError("Correo inválido")
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, any> = {}

      // Mapeo a los nombres que espera el backend
      payload.email = email?.trim() ?? null
      payload.first_name = firstName?.trim() ?? ""
      payload.last_name = lastName?.trim() ?? ""
      payload.is_active = !!isActive
      payload.is_staff = !!isStaff

      // Nota: no enviamos `username` por defecto porque el swagger `UserUpdate` no lo listó.
      await updateUser(user.id, payload)

      if (onUpdated) await onUpdated()
      onClose()
    } catch (err: any) {
      const data = err?.response?.data
      if (data) {
        if (typeof data === "string") setError(String(data))
        else if (data.detail) setError(String(data.detail))
        else if (data.email) setError(String(data.email))
        else setError(JSON.stringify(data))
      } else {
        setError("Error actualizando usuario")
      }
      console.error("EditUserDialog error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Usuario</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
            <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSubmit} className="ml-2" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
