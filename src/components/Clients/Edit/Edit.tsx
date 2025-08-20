"use client"

import React from "react"
import { updateClient, type AppClient, type UpdateClientPayload } from "@/lib/services/clients"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useModalCache } from "@/hooks/use-modal-cache"
import { toast } from "sonner"

type Props = {
  client: AppClient
  open: boolean
  onClose: () => void
  onUpdated?: () => Promise<void> | void
}

interface EditClientFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  billingAddress: string
}

export default function EditClientDialog({ client, open, onClose, onUpdated }: Props) {
  const [firstName, setFirstName] = React.useState(client.firstName ?? "")
  const [lastName, setLastName] = React.useState(client.lastName ?? "")
  const [email, setEmail] = React.useState(client.email ?? "")
  const [phone, setPhone] = React.useState(client.phone ?? "")
  const [address, setAddress] = React.useState(client.address ?? "")
  const [billingAddress, setBillingAddress] = React.useState(client.billingAddress ?? "")
  const [loading, setLoading] = React.useState(false)
  const mountedRef = React.useRef(true)
  const { saveToCache, getFromCache, clearCache } = useModalCache<EditClientFormData>()

  React.useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Cargar datos del caché cuando se abre el modal o cambia el cliente
  React.useEffect(() => {
    const cacheKey = `edit-client-${client.id}`
    if (open) {
      const cachedData = getFromCache(cacheKey)
      if (cachedData) {
        setFirstName(cachedData.firstName)
        setLastName(cachedData.lastName)
        setEmail(cachedData.email)
        setPhone(cachedData.phone)
        setAddress(cachedData.address)
        setBillingAddress(cachedData.billingAddress)
      } else {
        // Si no hay caché, usar datos del cliente
        setFirstName(client.firstName ?? "")
        setLastName(client.lastName ?? "")
        setEmail(client.email ?? "")
        setPhone(client.phone ?? "")
        setAddress(client.address ?? "")
        setBillingAddress(client.billingAddress ?? "")
      }
    }
  }, [client, open, getFromCache])

  // Guardar en caché cuando cambian los valores
  React.useEffect(() => {
    if (open) {
      const cacheKey = `edit-client-${client.id}`
      saveToCache(cacheKey, {
        firstName,
        lastName,
        email,
        phone,
        address,
        billingAddress
      })
    }
  }, [firstName, lastName, email, phone, address, billingAddress, client.id, open, saveToCache])

  function handleClose() {
    // Guardar datos antes de cerrar (para conservar cambios)
    const cacheKey = `edit-client-${client.id}`
    saveToCache(cacheKey, {
      firstName,
      lastName,
      email,
      phone,
      address,
      billingAddress
    })
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: UpdateClientPayload = {
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        billing_address: billingAddress || undefined,
        // No enviamos 'balance' aquí: permanece intacto en el servidor.
      }
      await updateClient(client.id, payload)
      
      // Limpiar caché después de actualizar exitosamente
      const cacheKey = `edit-client-${client.id}`
      clearCache(cacheKey)
      
      toast.success("Cliente actualizado")
      await (onUpdated ? onUpdated() : undefined)
      onClose()
    } catch (err: any) {
      console.error("Error actualizando cliente:", err)
      alert(err?.message ?? "Error actualizando cliente")
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">Nombre</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm">Apellido</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm">Correo</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm">Teléfono</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-sm">Dirección</label>
                <Input 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  placeholder="Dirección física del cliente"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="block text-sm">Dirección de facturación</label>
                <Input 
                  value={billingAddress} 
                  onChange={(e) => setBillingAddress(e.target.value)} 
                  placeholder="Dirección para envío de facturas"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" onClick={handleClose} disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Guardando..." : "Guardar"}</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
