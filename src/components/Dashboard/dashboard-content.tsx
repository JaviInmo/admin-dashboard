"use client"

import { DashboardKPISection } from "./DashboardKPISection"
import { DashboardChart } from "./DashboardChart"
import { DashboardTable } from "./DashboardTable"
import { DashboardGroupedChart } from "./DashboardGroupedChart"
import { useI18n } from "@/i18n"

export default function DashboardPage() {
  const { TEXT } = useI18n()
  return (
    <div className="flex flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">{TEXT.dashboard.title}</h2>
      <DashboardKPISection />
      <DashboardChart />
      <DashboardGroupedChart />
      <DashboardTable />
    </div>
  )
}
