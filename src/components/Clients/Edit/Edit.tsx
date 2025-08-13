"use client"

import React from "react"
import { updateClient, type AppClient, type UpdateClientPayload } from "@/lib/services/clients"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = {
  client: AppClient
  onClose: () => void
  onUpdated?: () => Promise<void> | void
}

export default function EditClientDialog({ client, onClose, onUpdated }: Props) {
  const [firstName, setFirstName] = React.useState(client.firstName ?? "")
  const [lastName, setLastName] = React.useState(client.lastName ?? "")
  const [email, setEmail] = React.useState(client.email ?? "")
  const [phone, setPhone] = React.useState(client.phone ?? "")
  const [balance, setBalance] = React.useState(client.balance ?? "")
  const [loading, setLoading] = React.useState(false)
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  React.useEffect(() => {
    // sync when client prop changes
    setFirstName(client.firstName ?? "")
    setLastName(client.lastName ?? "")
    setEmail(client.email ?? "")
    setPhone(client.phone ?? "")
    setBalance(client.balance ?? "")
  }, [client])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: UpdateClientPayload = {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        balance: balance || undefined,
      }
      await updateClient(client.id, payload)
      await (onUpdated ? onUpdated() : undefined)
      onClose()
      // toast.success("Cliente actualizado")
    } catch (err: any) {
      console.error("Error actualizando cliente:", err)
      alert(err?.message ?? "Error actualizando cliente")
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <h3 className="text-lg font-semibold mb-2">Editar Cliente</h3>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <label className="block text-sm">Nombre</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Apellido</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Correo</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Teléfono</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Balance</label>
            <Input value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
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
  width: 560,
  maxWidth: "95%",
  background: "var(--card-background, #fff)",
  padding: 20,
  borderRadius: 8,
  boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
}
