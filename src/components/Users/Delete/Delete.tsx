"use client"


import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { User } from "../types"

interface Props {
  user: User
  onClose: () => void
}

export default function DeleteUserDialog({ user, onClose }: Props) {
  const handleDelete = () => {
    console.log("Eliminar usuario:", user)
    onClose()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar Usuario</DialogTitle>
        </DialogHeader>
        <p>¿Seguro que quieres eliminar a <strong>{user.name}</strong>?</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
