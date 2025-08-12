"use client"

import { DashboardKPISection } from "./DashboardKPISection"
import { DashboardChart } from "./DashboardChart"
import { DashboardTable } from "./DashboardTable"
import { DashboardGroupedChart } from "./DashboardGroupedChart"
import { UI_TEXT } from "@/config/ui-text"

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">{UI_TEXT.dashboard.title}</h2>
      <DashboardKPISection />
      <DashboardChart />
      <DashboardGroupedChart />
      <DashboardTable />
    </div>
  )
}
