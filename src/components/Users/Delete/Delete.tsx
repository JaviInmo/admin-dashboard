"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { User } from "../types"
import { deleteUser } from "@/lib/services/users"

interface Props {
  user: User
  onClose: () => void
  onDeleted?: () => void | Promise<void>
}

export default function DeleteUserDialog({ user, onClose, onDeleted }: Props) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)
    setLoading(true)
    try {
      await deleteUser(user.id)
      // Si onDeleted devuelve una Promise, la esperamos
      if (onDeleted) await onDeleted()
      onClose()
    } catch (err: any) {
      const data = err?.response?.data
      if (data) {
        if (typeof data === "string") setError(data)
        else if (data.detail) setError(String(data.detail))
        else setError(JSON.stringify(data))
      } else {
        setError("Error eliminando usuario")
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar Usuario</DialogTitle>
        </DialogHeader>
        <p>¿Seguro que quieres eliminar a <strong>{user.name}</strong>?</p>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Eliminando..." : "Eliminar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
