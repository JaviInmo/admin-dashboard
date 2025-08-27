import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getAdvancedMetrics, METRICS_KEY } from "@/lib/services/dashboard-metrics";
import { useI18n } from "@/i18n";

export function AdvancedMetricsSection() {
  const { TEXT } = useI18n();
  const { data: metrics, isLoading } = useQuery({
    queryKey: [METRICS_KEY, 'advanced'],
    queryFn: getAdvancedMetrics,
    refetchInterval: 300000, // Actualizar cada 5 minutos
  });

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-US', { style: 'currency', currency: 'USD' }).format(amount);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-gray-400";
  };

  return (
    <div className="space-y-6">
      {/* Métricas Operacionales */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{TEXT.dashboard.metrics.operational.title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.operational.activeGuards}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.operational.activeGuards}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.operational.guardsOnDuty} {TEXT.dashboard.metrics.operational.guardsOnDuty}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.operational.shiftsThisMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.operational.totalShiftsThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                {formatPercentage(metrics.operational.attendanceRate)} {TEXT.dashboard.metrics.operational.attendance}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.operational.overtime}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(metrics.operational.overtimePercentage)}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.operational.averageShiftDuration}h {TEXT.dashboard.metrics.operational.averageShift}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Métricas Financieras */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{TEXT.dashboard.metrics.financial.title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.financial.monthlyRevenue}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.financial.monthlyRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {TEXT.dashboard.metrics.financial.margin}: {formatPercentage(metrics.financial.profitMargin)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.financial.costPerHour}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(metrics.financial.costPerHour)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(metrics.financial.revenuePerGuard)}{TEXT.dashboard.metrics.financial.perGuard}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.financial.pendingPayments}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(metrics.financial.pendingPayments)}
              </div>
              <p className="text-xs text-red-600">
                {formatCurrency(metrics.financial.overdueAmount)} {TEXT.dashboard.metrics.financial.overdue}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.financial.revenuePerProperty}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(metrics.financial.revenuePerProperty)}
              </div>
              <p className="text-xs text-muted-foreground">{TEXT.dashboard.metrics.financial.monthlyAverage}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Métricas de Seguridad */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{TEXT.dashboard.metrics.security.title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.security.incidentsThisMonth}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.security.incidentsThisMonth}</div>
              <div className="flex items-center gap-1">
                {getTrendIcon(metrics.security.incidentsLastMonth - metrics.security.incidentsThisMonth)}
                <span className={`text-xs ${getTrendColor(metrics.security.incidentsLastMonth - metrics.security.incidentsThisMonth)}`}>
                  {TEXT.dashboard.metrics.security.vsLastMonth} {metrics.security.incidentsLastMonth}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.security.responseTime}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.security.averageResponseTime}min</div>
              <p className="text-xs text-muted-foreground">
                {metrics.security.resolvedIncidents} {TEXT.dashboard.metrics.security.incidentsResolved}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.security.preventionScore}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{metrics.security.preventionScore}/100</div>
              <p className="text-xs text-muted-foreground">
                {metrics.security.highPriorityIncidents} {TEXT.dashboard.metrics.security.highPriority}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Métricas de Eficiencia */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{TEXT.dashboard.metrics.efficiency.title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.efficiency.propertyUtilization}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(metrics.efficiency.propertyUtilization)}</div>
              <p className="text-xs text-muted-foreground">{TEXT.dashboard.metrics.efficiency.fullCoverage}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.efficiency.guardEfficiency}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(metrics.efficiency.guardUtilization)}</div>
              <p className="text-xs text-muted-foreground">{TEXT.dashboard.metrics.efficiency.productiveTime}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.efficiency.clientSatisfaction}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics.efficiency.clientSatisfactionAvg.toFixed(1)}/5
              </div>
              <p className="text-xs text-muted-foreground">{TEXT.dashboard.metrics.efficiency.evaluationAverage}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{TEXT.dashboard.metrics.efficiency.renewalRate}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatPercentage(metrics.efficiency.contractRenewalRate)}
              </div>
              <p className="text-xs text-muted-foreground">{TEXT.dashboard.metrics.efficiency.contractsRenewed}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
