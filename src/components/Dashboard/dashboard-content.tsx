"use client"

import { DashboardKPISection } from "./DashboardKPISection"
import { DashboardChart } from "./DashboardChart"
import { DashboardTable } from "./DashboardTable"
import { DashboardGroupedChart } from "./DashboardGroupedChart"

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">Dashboard Overview</h2>
      <DashboardKPISection />
      <DashboardChart />
      <DashboardGroupedChart />
      <DashboardTable />
    </div>
  )
}
