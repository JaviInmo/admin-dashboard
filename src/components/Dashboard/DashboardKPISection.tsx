"use client"

import { DashboardCard } from "./DashboardCard"
import { DASHBOARD_CONFIG } from "@/config/ui-dashboard"

export function DashboardKPISection() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {DASHBOARD_CONFIG.kpis.map((kpi) => (
        <DashboardCard key={kpi.key} title={kpi.title} value={kpi.value} description={kpi.description} />
      ))}
    </div>
  )
}
