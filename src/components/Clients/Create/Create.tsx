"use client"

import React from "react"
import { createClient, type CreateClientPayload } from "@/lib/services/clients"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = {
  open: boolean
  onClose: () => void
  onCreated?: () => Promise<void> | void
}

export default function CreateClientDialog({ open, onClose, onCreated }: Props) {
  const [username, setUsername] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [balance, setBalance] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  React.useEffect(() => {
    if (!open) {
      // reset form when closed
      setUsername("")
      setFirstName("")
      setLastName("")
      setEmail("")
      setPhone("")
      setBalance("")
    }
  }, [open])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: CreateClientPayload = {
        // backend expects snake_case fields
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        balance: balance || undefined,
        // username is optional depending on your backend - include if applicable
        ...(username ? { username } : {}),
      }
      await createClient(payload)
      if (!mountedRef.current) return
      // optionally refresh parent
      await (onCreated ? onCreated() : undefined)
      onClose()
      // you can use toast here if you have one
      // toast.success("Cliente creado")
    } catch (err: any) {
      console.error("Error creando cliente:", err)
      alert(err?.message ?? "Error creando cliente")
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  return (
    <div style={backdropStyle}>
      <div style={modalStyle}>
        <h3 className="text-lg font-semibold mb-2">Crear Cliente</h3>
        <form onSubmit={handleSubmit} className="space-y-2">
          <div>
            <label className="block text-sm">Username (opcional)</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
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
            <label className="block text-sm">Balance (opcional)</label>
            <Input value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creando..." : "Crear"}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* Inline styles para modal simple */
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
