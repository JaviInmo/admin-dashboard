// Centralized dashboard UI data and visual constants
export const DASHBOARD_CONFIG = {
  kpis: [
    { key: 'clients', title: 'Clientes', value: 24, description: 'Activos este mes' },
    { key: 'properties', title: 'Propiedades', value: 58, description: 'Registradas en total' },
    { key: 'guards', title: 'Guardias', value: 15, description: 'En servicio' },
    { key: 'priceTotal', title: 'Precio Total', value: '$1000', description: 'En el mes actual' },
    { key: 'fuelCost', title: 'Costo Gasolina', value: '$450', description: 'Este mes' },
    { key: 'guardSalaries', title: 'Salarios de Guardia', value: '$500', description: 'Proyectados' },
  ],
  hoursChart: {
    height: 300,
    barSize: 50,
    tickFontSize: 14,
    gradient: { start: '#3b82f6', end: '#60a5fa', startOpacity: 0.9, endOpacity: 0.7, id: 'colorHoras' },
    gridStroke: '#e5e7eb',
    animationDuration: 800,
    data: [
      { name: 'Ene', horas: 120 },
      { name: 'Feb', horas: 140 },
      { name: 'Mar', horas: 110 },
      { name: 'Abr', horas: 150 },
    ],
  },
  costsChart: {
    height: 300,
    barSize: 30,
    tickFontSize: 14,
    gridStroke: '#e5e7eb',
    animationDuration: 800,
    fills: {
      precio: '#3b82f6',
      gasolina: '#f59e0b',
      salario: '#10b981',
    },
    data: [
      { name: 'Ene', precio: 1000, gasolina: 450, salario: 500 },
      { name: 'Feb', precio: 1200, gasolina: 480, salario: 520 },
      { name: 'Mar', precio: 900, gasolina: 400, salario: 480 },
      { name: 'Abr', precio: 1100, gasolina: 470, salario: 510 },
    ],
  },
  upcomingShifts: [
    { guard: 'Juan Pérez', location: 'Zona Norte', date: '2025-08-09' },
    { guard: 'Luis García', location: 'Zona Sur', date: '2025-08-10' },
  ],
} as const
