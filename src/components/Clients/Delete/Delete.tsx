"use client"

import React from "react"
import { deleteClient, type AppClient } from "@/lib/services/clients"
import { Button } from "@/components/ui/button"

type Props = {
  client: AppClient
  onClose: () => void
  onDeleted?: () => Promise<void> | void
}

export default function DeleteClientDialog({ client, onClose, onDeleted }: Props) {
  const [loading, setLoading] = React.useState(false)
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  async function handleDelete() {
    if (!confirm(`¿Eliminar cliente ${client.username ?? client.id}? Esta acción no se puede deshacer.`)) return
    setLoading(true)
    try {
      await deleteClient(client.id)
      await (onDeleted ? onDeleted() : undefined)
      onClose()
      // toast.success("Cliente eliminado")
    } catch (err: any) {
      console.error("Error borrando cliente:", err)
      alert(err?.message ?? "Error borrando cliente")
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <h3 className="text-lg font-semibold mb-2">Eliminar Cliente</h3>
        <p>¿Estás seguro que quieres eliminar <strong>{client.username ?? `${client.firstName ?? ""} ${client.lastName ?? ""}`}</strong>?</p>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleDelete} disabled={loading} className="bg-red-600 text-white">{loading ? "Eliminando..." : "Eliminar"}</Button>
        </div>
      </div>
    </div>
  )
}

/* Reutiliza los estilos del modal */
const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 60,
}

const modalStyle: React.CSSProperties = {
  width: 460,
  maxWidth: "95%",
  background: "var(--card-background, #fff)",
  padding: 18,
  borderRadius: 8,
  boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
}
