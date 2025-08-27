import { api } from "@/lib/http";
import { endpoints } from "@/lib/endpoints";

// === INTERFACES PARA MÉTRICAS AVANZADAS ===

export interface AdvancedDashboardMetrics {
  // Métricas operacionales
  operational: OperationalMetrics;
  // Métricas financieras
  financial: FinancialMetrics;
  // Métricas de seguridad
  security: SecurityMetrics;
  // Métricas de eficiencia
  efficiency: EfficiencyMetrics;
}

export interface OperationalMetrics {
  activeGuards: number;
  guardsOnDuty: number;
  totalShiftsThisMonth: number;
  averageShiftDuration: number;
  overtimePercentage: number;
  attendanceRate: number;
}

export interface FinancialMetrics {
  monthlyRevenue: number;
  monthlyExpenses: number;
  profitMargin: number;
  revenuePerGuard: number;
  revenuePerProperty: number;
  costPerHour: number;
  pendingPayments: number;
  overdueAmount: number;
}

export interface SecurityMetrics {
  incidentsThisMonth: number;
  incidentsLastMonth: number;
  averageResponseTime: number; // en minutos
  highPriorityIncidents: number;
  resolvedIncidents: number;
  preventionScore: number; // 0-100
}

export interface EfficiencyMetrics {
  propertyUtilization: number; // % de propiedades con cobertura completa
  guardUtilization: number; // % de tiempo productivo de guardias
  clientSatisfactionAvg: number; // Promedio de satisfacción (1-5)
  contractRenewalRate: number; // % de contratos renovados
  responseTimeEfficiency: number; // % de respuestas dentro del SLA
}

// === MÉTRICAS POR CATEGORÍAS ===

export interface MonthlyTrend {
  month: string;
  value: number;
  change: number; // % cambio vs mes anterior
}

export interface RegionalData {
  region: string;
  properties: number;
  guards: number;
  incidents: number;
  revenue: number;
}

export interface TopPerformer {
  id: number;
  name: string;
  metric: number;
  improvement: number;
}

// === FUNCIONES PARA OBTENER MÉTRICAS ===

export async function getAdvancedMetrics(): Promise<AdvancedDashboardMetrics> {
  try {
    const [guardsData, propertiesData] = await Promise.all([
      api.get(`${endpoints.guards}?page_size=1000`),
      api.get(`${endpoints.properties}?page_size=1000`),
    ]);

    const guards = guardsData.data?.results || [];
    const properties = propertiesData.data?.results || [];
    // const clients = clientsData.data?.results || [];

    const totalGuards = guards.length;
    const totalProperties = properties.length;
    // const totalClients = clients.length;
    // const activeClients = clients.filter((c: any) => c.is_active).length;

    // Calcular métricas operacionales
    const operational: OperationalMetrics = {
      activeGuards: totalGuards,
      guardsOnDuty: Math.round(totalGuards * 0.7), // Simulado: 70% en servicio
      totalShiftsThisMonth: totalGuards * 22, // ~22 días laborables
      averageShiftDuration: 8, // 8 horas promedio
      overtimePercentage: 15, // 15% de horas extra
      attendanceRate: 92, // 92% de asistencia
    };

    // Calcular métricas financieras
    const avgMonthlyRate = properties.reduce((sum: number, p: any) => 
      sum + (p.monthly_rate || 850), 0
    ) / Math.max(totalProperties, 1);
    
    const monthlyRevenue = totalProperties * avgMonthlyRate;
    const monthlyExpenses = totalGuards * 2500 + totalProperties * 200; // Salarios + gastos operativos
    
    const financial: FinancialMetrics = {
      monthlyRevenue,
      monthlyExpenses,
      profitMargin: ((monthlyRevenue - monthlyExpenses) / monthlyRevenue) * 100,
      revenuePerGuard: monthlyRevenue / Math.max(totalGuards, 1),
      revenuePerProperty: avgMonthlyRate,
      costPerHour: (monthlyExpenses / (totalGuards * 160)), // 160 horas/mes por guardia
      pendingPayments: monthlyRevenue * 0.15, // 15% pendiente
      overdueAmount: monthlyRevenue * 0.05, // 5% vencido
    };

    // Calcular métricas de seguridad (simuladas pero realistas)
    const security: SecurityMetrics = {
      incidentsThisMonth: Math.round(totalProperties * 0.3), // 30% de propiedades con incidentes
      incidentsLastMonth: Math.round(totalProperties * 0.35),
      averageResponseTime: 12, // 12 minutos promedio
      highPriorityIncidents: Math.round(totalProperties * 0.05), // 5% alta prioridad
      resolvedIncidents: Math.round(totalProperties * 0.28), // 95% de resolución
      preventionScore: 85, // Score de prevención
    };

    // Calcular métricas de eficiencia
    const efficiency: EfficiencyMetrics = {
      propertyUtilization: 87, // 87% de cobertura completa
      guardUtilization: 78, // 78% de tiempo productivo
      clientSatisfactionAvg: 4.2, // 4.2/5 promedio
      contractRenewalRate: 89, // 89% de renovación
      responseTimeEfficiency: 94, // 94% dentro del SLA
    };

    return {
      operational,
      financial,
      security,
      efficiency,
    };

  } catch (error) {
    console.error('Error fetching advanced metrics:', error);
    // Retornar valores por defecto
    return {
      operational: {
        activeGuards: 0,
        guardsOnDuty: 0,
        totalShiftsThisMonth: 0,
        averageShiftDuration: 0,
        overtimePercentage: 0,
        attendanceRate: 0,
      },
      financial: {
        monthlyRevenue: 0,
        monthlyExpenses: 0,
        profitMargin: 0,
        revenuePerGuard: 0,
        revenuePerProperty: 0,
        costPerHour: 0,
        pendingPayments: 0,
        overdueAmount: 0,
      },
      security: {
        incidentsThisMonth: 0,
        incidentsLastMonth: 0,
        averageResponseTime: 0,
        highPriorityIncidents: 0,
        resolvedIncidents: 0,
        preventionScore: 0,
      },
      efficiency: {
        propertyUtilization: 0,
        guardUtilization: 0,
        clientSatisfactionAvg: 0,
        contractRenewalRate: 0,
        responseTimeEfficiency: 0,
      },
    };
  }
}

// Función para obtener tendencias mensuales
export async function getMonthlyTrends(): Promise<{
  revenue: MonthlyTrend[];
  incidents: MonthlyTrend[];
  efficiency: MonthlyTrend[];
}> {
  try {
    const metrics = await getAdvancedMetrics();
    const months = ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Simular tendencias basadas en datos reales
    const revenue = months.map((month, index) => {
      const baseValue = metrics.financial.monthlyRevenue;
      const variation = 0.85 + (Math.sin(index * 0.5) + 1) * 0.15; // Variación realista
      const value = Math.round(baseValue * variation);
      const change = index === 0 ? 0 : Math.round((Math.random() - 0.5) * 20); // ±10%
      
      return { month, value, change };
    });

    const incidents = months.map((month, index) => {
      const baseValue = metrics.security.incidentsThisMonth;
      const variation = 0.7 + Math.random() * 0.6; // Más variabilidad en incidentes
      const value = Math.round(baseValue * variation);
      const change = index === 0 ? 0 : Math.round((Math.random() - 0.6) * 30); // Tendencia a mejorar
      
      return { month, value, change };
    });

    const efficiency = months.map((month, index) => {
      const baseValue = metrics.efficiency.responseTimeEfficiency;
      const variation = 0.95 + Math.random() * 0.1; // Eficiencia más estable
      const value = Math.round(baseValue * variation);
      const change = index === 0 ? 0 : Math.round((Math.random() - 0.3) * 10); // Tendencia a mejorar
      
      return { month, value, change };
    });

    return { revenue, incidents, efficiency };
    
  } catch (error) {
    console.error('Error fetching monthly trends:', error);
    return { revenue: [], incidents: [], efficiency: [] };
  }
}

// Función para obtener top performers
export async function getTopPerformers(): Promise<{
  guards: TopPerformer[];
  properties: TopPerformer[];
  clients: TopPerformer[];
}> {
  try {
    const [guardsData, propertiesData, clientsData] = await Promise.all([
      api.get(`${endpoints.guards}?page_size=5`),
      api.get(`${endpoints.properties}?page_size=5`),
      api.get(`${endpoints.clients}?page_size=5`),
    ]);

    const guards = (guardsData.data?.results || []).map((guard: any, index: number) => ({
      id: guard.id,
      name: `${guard.first_name} ${guard.last_name}`,
      metric: 95 - index * 2, // Score de desempeño
      improvement: Math.round((Math.random() - 0.2) * 15), // Mejora vs mes anterior
    }));

    const properties = (propertiesData.data?.results || []).map((property: any, index: number) => ({
      id: property.id,
      name: property.name || property.address,
      metric: property.monthly_rate || 850 + index * 100, // Valor del contrato
      improvement: Math.round((Math.random() - 0.3) * 20),
    }));

    const clients = (clientsData.data?.results || []).map((client: any, index: number) => ({
      id: client.id,
      name: client.username || `${client.first_name} ${client.last_name}`,
      metric: 4.8 - index * 0.1, // Score de satisfacción
      improvement: Math.round((Math.random() - 0.4) * 0.5 * 100) / 100, // Mejora en score
    }));

    return { guards, properties, clients };
    
  } catch (error) {
    console.error('Error fetching top performers:', error);
    return { guards: [], properties: [], clients: [] };
  }
}

export const METRICS_KEY = 'dashboard-metrics';
