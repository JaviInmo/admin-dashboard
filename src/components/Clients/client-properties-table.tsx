"use client"

import React from "react"
import { Pencil, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface Property {
  id: number
  name: string
  price: number
  hours: number
  fuelCost: number
}

interface ClientPropertiesTableProps {
  properties: Property[]
  clientName: string
}

export default function ClientPropertiesTable({ properties, clientName }: ClientPropertiesTableProps) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      <h3 className="text-lg font-semibold">Propiedades de {clientName}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead className="text-center">Precio ($)</TableHead>
            <TableHead className="text-center">Horas/Mes</TableHead>
            <TableHead className="text-center">Gasolina ($)</TableHead>
            <TableHead className="w-[100px] text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.map((property) => (
            <TableRow key={property.id}>
              <TableCell>{property.name}</TableCell>
              <TableCell className="text-center">{property.price}</TableCell>
              <TableCell className="text-center">{property.hours}</TableCell>
              <TableCell className="text-center">{property.fuelCost}</TableCell>
              <TableCell className="flex gap-2 justify-center">
                <Button size="icon" variant="ghost" onClick={() => alert(`Editar ${property.name}`)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => alert(`Eliminar ${property.name}`)}>
                  <Trash className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
