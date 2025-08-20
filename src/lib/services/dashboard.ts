import { api } from "@/lib/http";
import { endpoints } from "@/lib/endpoints";

export interface DashboardStats {
  totalClients: number;
  totalProperties: number;
  totalGuards: number;
  activeClients: number;
  monthlyRevenue: number;
  monthlyFuelCosts: number;
  monthlyGuardSalaries: number;
}

export interface MonthlyData {
  month: string;
  hours: number;
  revenue: number;
  fuelCosts: number;
  guardSalaries: number;
}

export interface UpcomingShift {
  id: number;
  guardName: string;
  propertyName: string;
  date: string;
  startTime: string;
  endTime: string;
}

// Función para obtener estadísticas generales del dashboard
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Obtener datos de diferentes endpoints
    const [clientsResponse, propertiesResponse, guardsResponse] = await Promise.all([
      api.get(endpoints.clients),
      api.get(endpoints.properties),
      api.get(endpoints.guards),
    ]);

    // Contar totales
    const totalClients = clientsResponse.data?.count || 0;
    const totalProperties = propertiesResponse.data?.count || 0;
    const totalGuards = guardsResponse.data?.count || 0;
    
    // Contar clientes activos
    const activeClients = clientsResponse.data?.results?.filter(
      (client: any) => client.is_active
    ).length || 0;

    // Por ahora, calcular datos ficticios basados en los totales reales
    // TODO: Implementar endpoints específicos para estas métricas
    const monthlyRevenue = totalProperties * 850; // Precio promedio por propiedad
    const monthlyFuelCosts = totalProperties * 125; // Costo promedio de combustible
    const monthlyGuardSalaries = totalGuards * 2500; // Salario promedio por guardia

    return {
      totalClients,
      totalProperties,
      totalGuards,
      activeClients,
      monthlyRevenue,
      monthlyFuelCosts,
      monthlyGuardSalaries,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Retornar valores por defecto en caso de error
    return {
      totalClients: 0,
      totalProperties: 0,
      totalGuards: 0,
      activeClients: 0,
      monthlyRevenue: 0,
      monthlyFuelCosts: 0,
      monthlyGuardSalaries: 0,
    };
  }
}

// Función para obtener datos mensuales (por ahora simulados)
export async function getMonthlyData(): Promise<MonthlyData[]> {
  try {
    const stats = await getDashboardStats();
    
    // Generar datos de los últimos 6 meses basados en datos reales
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    
    return months.map((month, index) => {
      // Variar los datos basándose en el mes para simular fluctuaciones
      const variation = 0.8 + (Math.sin(index) + 1) * 0.2; // Variación entre 0.8 y 1.2
      
      return {
        month,
        hours: Math.round(stats.totalProperties * 40 * variation), // ~40 horas por propiedad
        revenue: Math.round(stats.monthlyRevenue * variation),
        fuelCosts: Math.round(stats.monthlyFuelCosts * variation),
        guardSalaries: Math.round(stats.monthlyGuardSalaries * variation),
      };
    });
  } catch (error) {
    console.error('Error fetching monthly data:', error);
    return [];
  }
}

// Función para obtener próximos turnos (simulados por ahora)
export async function getUpcomingShifts(): Promise<UpcomingShift[]> {
  try {
    const [guardsResponse, propertiesResponse] = await Promise.all([
      api.get(`${endpoints.guards}?page_size=5`),
      api.get(`${endpoints.properties}?page_size=5`),
    ]);

    const guards = guardsResponse.data?.results || [];
    const properties = propertiesResponse.data?.results || [];

    if (guards.length === 0 || properties.length === 0) {
      return [];
    }

    // Simular próximos turnos combinando guardias y propiedades reales
    const upcomingShifts: UpcomingShift[] = [];
    const today = new Date();
    
    for (let i = 0; i < Math.min(5, guards.length, properties.length); i++) {
      const guard = guards[i];
      const property = properties[i];
      const shiftDate = new Date(today);
      shiftDate.setDate(today.getDate() + i + 1);
      
      upcomingShifts.push({
        id: i + 1,
        guardName: `${guard.first_name} ${guard.last_name}`,
        propertyName: property.name || property.address,
        date: shiftDate.toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '16:00',
      });
    }

    return upcomingShifts;
  } catch (error) {
    console.error('Error fetching upcoming shifts:', error);
    return [];
  }
}

// Clave para React Query
export const DASHBOARD_KEY = 'dashboard';
