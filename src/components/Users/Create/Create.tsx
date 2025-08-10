"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Permissions } from "../types"

const emptyPermissions: Permissions = {
  cliente: { create: false, edit: false, read: false, delete: false },
  guardia: { create: false, edit: false, read: false, delete: false },
  ubicacion: { create: false, edit: false, read: false, delete: false },
  dashboard: { create: false, edit: false, read: false, delete: false },
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function CreateUserDialog({ open, onClose }: Props) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [permissions, setPermissions] = React.useState<Permissions>(emptyPermissions)

  const handleSubmit = () => {
    console.log("Crear usuario:", { name, email, password, permissions })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Usuario</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="border rounded p-2">
            <p className="font-semibold mb-2">Permisos</p>
            {Object.keys(permissions).map((section) => (
              <div key={section} className="mb-2">
                <p className="capitalize font-medium">{section}</p>
                {Object.keys(permissions[section as keyof Permissions]).map((action) => (
                  <label key={action} className="mr-2">
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
                    />{" "}
                    {action}
                  </label>
                ))}
              </div>
            ))}
          </div>
          <Button onClick={handleSubmit}>Crear</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
