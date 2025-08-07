"use client"

import * as React from "react"

export default function UsersContent() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">
          Aquí puedes listar y gestionar los usuarios del sistema.
        </p>
        <div className="mt-4 h-48 w-full rounded-md bg-green-100/50 flex items-center justify-center text-green-800">
          Contenido de Usuarios
        </div>
      </div>
    </div>
  )
}
