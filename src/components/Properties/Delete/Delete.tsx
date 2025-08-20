"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { AppProperty } from "@/lib/services/properties"
import { deleteProperty } from "@/lib/services/properties"

interface Props {
  property: AppProperty
  open: boolean
  onClose: () => void
  onDeleted?: () => void | Promise<void>
}

export default function DeletePropertyDialog({ property, open, onClose, onDeleted }: Props) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)
    setLoading(true)
    try {
      await deleteProperty(property.id)
      if (onDeleted) await onDeleted()
      onClose()
    } catch (err: any) {
      const data = err?.response?.data
      if (data) {
        if (typeof data === "string") setError(data)
        else if (data.detail) setError(String(data.detail))
        else setError(JSON.stringify(data))
      } else {
        setError("Error eliminando propiedad")
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const label = property.name ? `${property.name} (${property.address})` : `${property.address} (#${property.id})`

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar Propiedad</DialogTitle>
        </DialogHeader>
        <p>¿Seguro que quieres eliminar <strong>{label}</strong>?</p>

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
