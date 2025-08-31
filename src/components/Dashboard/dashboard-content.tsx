"use client"

import { useI18n } from "@/i18n";
import { DashboardKPISection } from "./DashboardKPISection";
import { DashboardGroupedChart } from "./DashboardGroupedChart";
import { DashboardTable } from "./DashboardTable";
import { AdvancedMetricsSection } from "./AdvancedMetricsSection";
import { ShiftsTimeline } from "./ShiftsTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardPage() {
  const { TEXT } = useI18n();
  
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
          {/* Sección de reportes */}
          <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold mb-4">{TEXT.dashboard.reports.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <h4 className="font-medium">{TEXT.dashboard.reports.monthlyOperations.title}</h4>
                <p className="text-sm text-muted-foreground">{TEXT.dashboard.reports.monthlyOperations.description}</p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <h4 className="font-medium">{TEXT.dashboard.reports.incidentAnalysis.title}</h4>
                <p className="text-sm text-muted-foreground">{TEXT.dashboard.reports.incidentAnalysis.description}</p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <h4 className="font-medium">{TEXT.dashboard.reports.financialReport.title}</h4>
                <p className="text-sm text-muted-foreground">{TEXT.dashboard.reports.financialReport.description}</p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <h4 className="font-medium">{TEXT.dashboard.reports.guardPerformance.title}</h4>
                <p className="text-sm text-muted-foreground">{TEXT.dashboard.reports.guardPerformance.description}</p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <h4 className="font-medium">{TEXT.dashboard.reports.clientSatisfaction.title}</h4>
                <p className="text-sm text-muted-foreground">{TEXT.dashboard.reports.clientSatisfaction.description}</p>
              </div>
              <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <h4 className="font-medium">{TEXT.dashboard.reports.geographicAnalysis.title}</h4>
                <p className="text-sm text-muted-foreground">{TEXT.dashboard.reports.geographicAnalysis.description}</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
