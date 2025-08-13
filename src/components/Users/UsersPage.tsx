"use client"

import * as React from "react"
import UsersTable from "./UsersTable"
import UserPermissionsTable from "./UserPermissionsTable"
import type { User, Permissions, AppSection, PermissionAction } from "./types"
import { listUsers, getUser } from "@/lib/services/users"

export default function UsersPage() {
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null)
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [selectedUserLabel, setSelectedUserLabel] = React.useState<string | null>(null)

  const fetchUsers = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listUsers()
      setUsers(data as unknown as User[])
    } catch (err: any) {
      const data = err?.response?.data
      if (data && typeof data !== "string") {
        setError(data.detail ?? JSON.stringify(data))
      } else {
        setError(String(data ?? "Error cargando usuarios"))
      }
      console.error("fetchUsers error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  React.useEffect(() => {
    if (selectedUserId == null) {
      setSelectedUserLabel(null)
      return
    }
    const found = users.find((u) => Number(u.id) === Number(selectedUserId))
    if (found) {
      setSelectedUserLabel(found.username ?? found.name ?? `#${selectedUserId}`)
      return
    }
    let mounted = true
    const load = async () => {
      try {
        const u = await getUser(selectedUserId!)
        if (!mounted) return
        setSelectedUserLabel(u.username ?? u.name ?? `#${selectedUserId}`)
      } catch {
        if (mounted) setSelectedUserLabel(`#${selectedUserId}`)
      }
    }
    void load()
    return () => { mounted = false }
  }, [selectedUserId, users])

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

      {error && <div className="rounded-lg border bg-card p-4 text-red-600">{error}</div>}

      <UsersTable
        users={users}
        onSelectUser={(id) => setSelectedUserId(id)}
        onRefresh={fetchUsers}
      />

      {loading ? (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p>Cargando usuarios...</p>
        </div>
      ) : selectedUserId ? (
        <UserPermissionsTable
          userId={selectedUserId}
          userLabel={selectedUserLabel ?? `#${selectedUserId}`}
          onUpdated={fetchUsers}
        />
      ) : (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Selecciona un usuario para ver y editar sus permisos.</p>
        </div>
      )}
    </div>
  )
}
