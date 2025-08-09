"use client"


import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Permissions, AppSection, PermissionAction } from "./types"

import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"

interface UserPermissionsTableProps {
  permissions: Permissions
  onChange: (section: AppSection, action: PermissionAction, value: boolean) => void
}

const sections: { key: AppSection; label: string }[] = [
  { key: "cliente", label: "Cliente" },
  { key: "guardia", label: "Guardia" },
  { key: "ubicacion", label: "Ubicación" },
  { key: "dashboard", label: "Dashboard" },
]

const actions: { key: PermissionAction; label: string }[] = [
  { key: "create", label: "Crear" },
  { key: "edit", label: "Editar" },
  { key: "read", label: "Leer" },
  { key: "delete", label: "Eliminar" },
]

export default function UserPermissionsTable({ permissions, onChange }: UserPermissionsTableProps) {
  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Permisos del Usuario</h3>
        <Button onClick={() => alert("Guardar permisos")}>Guardar</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sección</TableHead>
            {actions.map((action) => (
              <TableHead key={action.key} className="text-center">{action.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.map((section) => (
            <TableRow key={section.key}>
              <TableCell>{section.label}</TableCell>
              {actions.map((action) => (
                <TableCell key={action.key} className="text-center">
                  <Checkbox
                    checked={permissions[section.key][action.key]}
                    onCheckedChange={(value) => onChange(section.key, action.key, !!value)}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
