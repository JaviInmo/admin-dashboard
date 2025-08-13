"use client"

import * as React from "react"
import UsersTable from "./UsersTable"
import UserPermissionsTable from "./UserPermissionsTable"
import type { User } from "./types"
import { listUsers, getUser } from "@/lib/services/users"

export default function UsersPage() {
  const [selectedUserId, setSelectedUserId] = React.useState<number | null>(null)
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [page, setPage] = React.useState<number>(1)
  const [count, setCount] = React.useState<number>(0)
  const [pageSize] = React.useState<number>(10)
  const [search, setSearch] = React.useState<string>("")
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize))

  const [selectedUserLabel, setSelectedUserLabel] = React.useState<string | null>(null)

  const fetchUsers = React.useCallback(async (p = 1, q?: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await listUsers(p, q, pageSize)
      setUsers(res.items as unknown as User[])
      setCount(res.count ?? 0)
      setPage(p)
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
  }, [pageSize])

  React.useEffect(() => {
    void fetchUsers(1)
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

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>

      {error && <div className="rounded-lg border bg-card p-4 text-red-600">{error}</div>}

      <UsersTable
        users={users}
        onSelectUser={(id) => setSelectedUserId(id)}
        onRefresh={() => fetchUsers(page, search)}
        serverSide={true}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => void fetchUsers(p, search)}
        pageSize={pageSize}
        onSearch={(term) => { setSearch(term); void fetchUsers(1, term) }}
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
