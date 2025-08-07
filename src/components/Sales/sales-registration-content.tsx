"use client"

import * as React from "react"

export default function SalesRegistrationContent() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <h2 className="text-2xl font-bold">Registro de Ventas</h2>
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">
          Aquí puedes añadir formularios o tablas para el registro de ventas.
        </p>
        <div className="mt-4 h-48 w-full rounded-md bg-blue-100/50 flex items-center justify-center text-blue-800">
          Contenido de Registro de Ventas
        </div>
      </div>
    </div>
  )
}
