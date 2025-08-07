"use client"

import * as React from "react"

export default function DashboardContent() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <h2 className="text-2xl font-bold">Dashboard Overview</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <h3 className="text-lg font-semibold">Owners</h3>
          <p className="text-sm text-muted-foreground">Contenido para la tarjeta 1.</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <h3 className="text-lg font-semibold">Card 2</h3>
          <p className="text-sm text-muted-foreground">Contenido para la tarjeta 2.</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <h3 className="text-lg font-semibold">Card 3</h3>
          <p className="text-sm text-muted-foreground">Contenido para la tarjeta 3.</p>
        </div>
      </div>
      <div className="flex-1 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="text-lg font-semibold">Área de Contenido Principal del Dashboard</h3>
        <p className="text-sm text-muted-foreground">
          Aquí irá el contenido principal de tu dashboard. Se ajusta
          dinámicamente con el sidebar.
        </p>
        <div className="mt-4 h-64 w-full rounded-md bg-muted/50" />
      </div>
    </div>
  )
}
