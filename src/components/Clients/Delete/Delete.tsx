"use client"

import React from "react"
import { deleteClient, type AppClient } from "@/lib/services/clients"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

type Props = {
  client: AppClient
  open: boolean
  onClose: () => void
  onDeleted?: () => Promise<void> | void
}

export default function DeleteClientDialog({ client, open, onClose, onDeleted }: Props) {
  const [loading, setLoading] = React.useState(false)
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteClient(client.id)
      toast.success("Cliente eliminado exitosamente")
      await (onDeleted ? onDeleted() : undefined)
      onClose()
    } catch (err: any) {
      console.error("Error borrando cliente:", err)
      toast.error(err?.message ?? "Error borrando cliente")
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <p>¿Estás seguro que quieres eliminar <strong>{client.username ?? `${client.firstName ?? ""} ${client.lastName ?? ""}`}</strong>?</p>
          <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer.</p>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button onClick={handleDelete} disabled={loading} variant="destructive">{loading ? "Eliminando..." : "Eliminar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
