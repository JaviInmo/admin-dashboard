"use client"

import { useI18n } from "@/i18n"
import { DashboardKPISection } from "./DashboardKPISection"
import { DashboardGroupedChart } from "./DashboardGroupedChart"
import { DashboardTable } from "./DashboardTable"
import { AdvancedMetricsSection } from "./AdvancedMetricsSection"
import { ShiftsTimeline } from "./ShiftsTimeline"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReportsTab } from "./Reports/ReportsTab"

export default function DashboardPage() {
  const { TEXT } = useI18n()

  return (
    <div className="flex flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">{TEXT.dashboard.title}</h2>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{TEXT.dashboard.tabs.overview}</TabsTrigger>
          <TabsTrigger value="timeline">{TEXT.dashboard.tabs.timeline}</TabsTrigger>
          <TabsTrigger value="advanced">{TEXT.dashboard.tabs.advanced}</TabsTrigger>
          <TabsTrigger value="reports">{TEXT.dashboard.tabs.reports}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Section - Métricas principales */}
          <DashboardKPISection />

          {/* Charts Section - Gráficos */}
          <DashboardGroupedChart />

          {/* Table Section - Tabla de turnos próximos */}
          <DashboardTable />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          {/* Timeline de Turnos en Tiempo Real */}
          <ShiftsTimeline />
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          {/* Métricas avanzadas */}
          <AdvancedMetricsSection />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
