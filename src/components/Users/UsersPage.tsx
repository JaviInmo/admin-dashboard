"use client"

import * as React from "react"
import UsersTable from "./UsersTable"
import UserPermissionsTable from "./UserPermissionsTable"
import type { User, Permissions, AppSection, PermissionAction } from "./types"


export default function UsersPage() {
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null)

  // Datos de prueba
  const users: User[] = [
    { id: 1, name: "Juan Pérez", email: "juan@example.com" },
    { id: 2, name: "Ana Gómez", email: "ana@example.com" },
    { id: 3, name: "Luis Torres", email: "luis@example.com" },
  ]

  const [permissions, setPermissions] = React.useState<Permissions>({
    cliente: { create: false, edit: false, read: false, delete: false },
    guardia: { create: false, edit: false, read: false, delete: false },
    ubicacion: { create: false, edit: false, read: false, delete: false },
    dashboard: { create: false, edit: false, read: false, delete: false },
  })

  const handlePermissionChange = (section: AppSection, action: PermissionAction, value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [action]: value,
      },
    }))
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>

      <UsersTable users={users} onSelectUser={setSelectedUserId} />

      {selectedUserId ? (
        <UserPermissionsTable permissions={permissions} onChange={handlePermissionChange} />
      ) : (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Selecciona un usuario para ver y editar sus permisos.</p>
        </div>
      )}
    </div>
  )
}
