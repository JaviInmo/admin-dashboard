"use client"

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, MapPin, User, AlertCircle, Loader2, Camera, FileText, Filter, Activity } from "lucide-react";
import { listShifts } from "@/lib/services/shifts";
import { listGuards } from "@/lib/services/guard";
import { listProperties } from "@/lib/services/properties";
import { listServicesByProperty } from "@/lib/services/services";
import type { Shift } from "@/components/Shifts/types";
import type { Guard } from "@/components/Guards/types";
import type { AppProperty } from "@/lib/services/properties";
import type { Service } from "@/components/Services/types";

interface ShiftEvent {
  id: string;
  guardName: string;
  propertyName: string;
  propertyAddress: string;
  startTime: Date;
  endTime: Date;
  status: 'active' | 'upcoming' | 'completed' | 'delayed';
  type: 'regular' | 'overtime' | 'emergency';
  serviceName?: string;
  serviceTimeLabel?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'upcoming':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'delayed':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'active':
      return 'En Servicio';
    case 'upcoming':
      return 'Próximo';
    case 'completed':
      return 'Completado';
    case 'delayed':
      return 'Retrasado';
    default:
      return 'Desconocido';
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'regular':
      return 'bg-blue-50 text-blue-700';
    case 'overtime':
      return 'bg-orange-50 text-orange-700';
    case 'emergency':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-gray-50 text-gray-700';
  }
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
};

const formatDate = (date: Date) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hoy';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Mañana';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ayer';
  } else {
    return date.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }
};

// Función para convertir cualquier formato de fecha a Date
const parseDate = (dateInput: any): Date => {
  if (!dateInput) return new Date();

  // Si ya es un objeto Date, devolverlo
  if (dateInput instanceof Date) return dateInput;

  // Si es string, intentar diferentes formatos
  if (typeof dateInput === 'string') {
    // Intentar parsear como ISO string
    const isoDate = new Date(dateInput);
    if (!isNaN(isoDate.getTime())) {
      console.log('📅 Fecha parseada como ISO:', dateInput, '->', isoDate.toISOString());
      return isoDate;
    }

    // Intentar otros formatos comunes
    console.warn('⚠️ Fecha no pudo parsearse:', dateInput);
    return new Date();
  }

  // Si es número (timestamp), convertir
  if (typeof dateInput === 'number') {
    const dateFromTimestamp = new Date(dateInput);
    console.log('📅 Fecha parseada como timestamp:', dateInput, '->', dateFromTimestamp.toISOString());
    return dateFromTimestamp;
  }

  console.warn('⚠️ Formato de fecha desconocido:', dateInput);
  return new Date();
};

// Función para determinar el estado del turno basado en las fechas
const determineShiftStatus = (startTime: any, endTime: any, originalStatus: string): 'active' | 'upcoming' | 'completed' | 'delayed' => {
  const now = new Date();
  const start = parseDate(startTime);
  const end = parseDate(endTime);

  console.log('🔍 Debug turno:', {
    originalStart: startTime,
    originalEnd: endTime,
    parsedStart: start.toISOString(),
    parsedEnd: end.toISOString(),
    now: now.toISOString(),
    originalStatus,
    isActive: now >= start && now <= end,
    isCompleted: now > end,
    isUpcoming: now < start
  });

  // Si el turno ya terminó
  if (now > end) {
    console.log('✅ Turno completado');
    return 'completed';
  }

  // Si el turno está en progreso
  if (now >= start && now <= end) {
    console.log('🎯 Turno ACTIVO encontrado!');
    return 'active';
  }

  // Si el turno es futuro
  if (now < start) {
    console.log('⏰ Turno próximo');
    return 'upcoming';
  }

  // Si hay algún problema con el estado original, determinar si está retrasado
  if (originalStatus === 'scheduled' && now > start) {
    console.log('⚠️ Turno retrasado');
    return 'delayed';
  }

  console.log('❓ Estado por defecto: upcoming');
  return 'upcoming';
};

// Función para convertir datos de la API a ShiftEvent
const convertToShiftEvent = (shift: Shift, guard: Guard | undefined, property: AppProperty | undefined): ShiftEvent => {
  // Validar que startTime y endTime no sean null/undefined
  if (!shift.startTime || !shift.endTime) {
    console.warn('⚠️ Turno sin fechas válidas:', shift.id);
    throw new Error(`Shift ${shift.id} has invalid time data`);
  }

  const startTime = parseDate(shift.startTime);
  const endTime = parseDate(shift.endTime);

  console.log('🔄 Convirtiendo turno:', {
    id: shift.id,
    originalStart: shift.startTime,
    originalEnd: shift.endTime,
    parsedStart: startTime.toISOString(),
    parsedEnd: endTime.toISOString()
  });

  // Determinar el tipo de turno basado en horarios
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  const isWeekend = startTime.getDay() === 0 || startTime.getDay() === 6;
  const isNightShift = startTime.getHours() >= 22 || startTime.getHours() <= 6;

  let type: 'regular' | 'overtime' | 'emergency' = 'regular';
  if (duration > 12) {
    type = 'overtime';
  } else if (isWeekend || isNightShift) {
    type = 'emergency';
  }

  // construir etiqueta de horario del servicio si existe en detalles (HH:mm)
  let serviceTimeLabel: string | undefined;
  const st = shift.serviceDetails?.startTime || (shift.serviceDetails as Record<string, unknown>)?.start_time as string;
  const et = shift.serviceDetails?.endTime || (shift.serviceDetails as Record<string, unknown>)?.end_time as string;
  if (typeof st === 'string' && typeof et === 'string' && st && et) {
    serviceTimeLabel = `${st} - ${et}`;
  }

  const shiftEvent: ShiftEvent = {
    id: shift.id.toString(),
    guardName: guard ? `${guard.firstName} ${guard.lastName}` : `Guardia #${shift.guard}`,
    propertyName: property?.name || property?.alias || `Propiedad #${shift.property}`,
    propertyAddress: property?.address || 'Dirección no disponible',
    startTime,
    endTime,
    status: determineShiftStatus(shift.startTime, shift.endTime, shift.status || 'scheduled'),
    type,
    serviceName: shift.serviceDetails?.name || undefined,
    serviceTimeLabel,
  };

  console.log('✅ Turno convertido:', {
    id: shiftEvent.id,
    guardName: shiftEvent.guardName,
    status: shiftEvent.status,
    startTime: shiftEvent.startTime.toISOString(),
    endTime: shiftEvent.endTime.toISOString()
  });

  return shiftEvent;
};

export function ShiftsTimeline() {
  const [shifts, setShifts] = React.useState<ShiftEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // Estados para filtros
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [propertyFilter, setPropertyFilter] = React.useState<string>("all");
  const [serviceFilter, setServiceFilter] = React.useState<string>("all");
  
  // Datos para filtros
  const [properties, setProperties] = React.useState<AppProperty[]>([]);
  const [services, setServices] = React.useState<Service[]>([]);

  React.useEffect(() => {
    async function fetchShiftsData() {
      try {
        setLoading(true);
        setError(null);

        console.log('🕐 Hora actual del sistema:', new Date().toISOString());

        // Obtener turnos de los últimos 2 días y próximos 2 días
        const today = new Date();
        const twoDaysAgo = new Date(today);
        twoDaysAgo.setDate(today.getDate() - 2);
        const twoDaysFromNow = new Date(today);
        twoDaysFromNow.setDate(today.getDate() + 2);

        // Obtener datos en paralelo
        const [shiftsResult, guardsResult, propertiesResult] = await Promise.all([
          listShifts(1, undefined, 1000, '-start_time'), // Obtener TODOS los turnos
          listGuards(1, undefined, 1000), // Obtener TODAS las guardias
          listProperties(1, undefined, 1000) // Obtener TODAS las propiedades
        ]);

        // ===== DATOS MOCK PARA PRUEBAS =====
        // Este código agrega un guardia, propiedad y turno mock para probar
        // la funcionalidad de turnos activos en el dashboard
        console.log('🎭 === INICIANDO CARGA DE DATOS MOCK ===');
        const mockGuard = {
          id: 999,
          firstName: 'Carlos',
          lastName: 'Rodríguez',
          email: 'carlos.rodriguez@security.com',
          phone: '+1234567890',
          ssn: null,
          address: 'Calle Principal 123',
          birthdate: '1985-03-15'
        };

        // Agregar propiedad mock
        const mockProperty = {
          id: 999,
          name: 'Centro Comercial Plaza Mayor',
          alias: 'Plaza Mayor',
          address: 'Av. Principal 456, Ciudad Central',
          ownerId: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Agregar turno mock activo
        const now = new Date();
        const shiftStart = new Date(now.getTime() - (2 * 60 * 60 * 1000)); // 2 horas atrás
        const shiftEnd = new Date(now.getTime() + (4 * 60 * 60 * 1000)); // 4 horas adelante

        const mockShift = {
          id: 999,
          guard: 999,
          property: 999,
          startTime: shiftStart.toISOString(),
          endTime: shiftEnd.toISOString(),
          status: 'scheduled',
          hoursWorked: 0,
          isActive: true,
          guardName: 'Carlos Rodríguez',
          propertyName: 'Centro Comercial Plaza Mayor',
          propertyAddress: 'Av. Principal 456, Ciudad Central',
          type: 'regular',
          serviceDetails: {
            id: 1,
            name: 'Vigilancia General',
            description: 'Servicio de vigilancia general del centro comercial',
            startTime: '08:00',
            endTime: '18:00',
            rate: '15.50',
            totalHours: '8',
            recurrent: true
          }
        };

        console.log('🎭 Agregando guardia mock:', mockGuard);
        console.log('🏢 Agregando propiedad mock:', mockProperty);
        console.log('⏰ Agregando turno mock:', {
          id: mockShift.id,
          startTime: mockShift.startTime,
          endTime: mockShift.endTime,
          status: mockShift.status,
          isActive: mockShift.isActive,
          guardId: mockShift.guard,
          propertyId: mockShift.property,
          guardName: mockShift.guardName,
          propertyName: mockShift.propertyName,
          type: mockShift.type
        });

        // Agregar a los arrays de resultados
        guardsResult.items.push(mockGuard);
        propertiesResult.items.push(mockProperty);
        shiftsResult.items.unshift(mockShift); // Agregar al inicio para que aparezca primero

        console.log('✅ Datos mock agregados exitosamente');
        console.log('📊 Total guardias:', guardsResult.items.length);
        console.log('🏢 Total propiedades:', propertiesResult.items.length);
        console.log('⏰ Total turnos:', shiftsResult.items.length);
        console.log('🎭 === DATOS MOCK CARGADOS EXITOSAMENTE ===');

        // Guardar propiedades para filtros
        setProperties(propertiesResult.items);

        // Crear mapas para búsqueda rápida
        const guardsMap: Record<number, any> = {};
        guardsResult.items.forEach(guard => {
          guardsMap[guard.id] = guard;
        });

        const propertiesMap: Record<number, any> = {};
        propertiesResult.items.forEach(property => {
          propertiesMap[property.id] = property;
        });

        // Obtener servicios de todas las propiedades para filtros
        const allServices: Service[] = [];
        for (const property of propertiesResult.items) {
          try {
            const servicesResult = await listServicesByProperty(property.id);
            allServices.push(...(servicesResult.items || servicesResult));
          } catch (error) {
            console.warn(`Error loading services for property ${property.id}:`, error);
          }
        }
        setServices(allServices);

        // Usar TODOS los turnos del backend (sin filtrar por fecha)
        const relevantShifts = shiftsResult.items.filter(shift => {
          // Solo filtrar turnos que tengan fecha válida
          const hasValidDates = shift.startTime && shift.endTime;
          if (!hasValidDates) {
            console.warn('⚠️ Turno sin fechas:', shift.id);
            return false;
          }

          // Intentar parsear las fechas para verificar que sean válidas
          try {
            const startDate = parseDate(shift.startTime);
            const endDate = parseDate(shift.endTime);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              console.warn('⚠️ Fechas inválidas en turno:', shift.id, shift.startTime, shift.endTime);
              return false;
            }

            return true;
          } catch (error) {
            console.warn('⚠️ Error parseando fechas del turno:', shift.id, error);
            return false;
          }
        });

        console.log('📊 Total de turnos del backend:', shiftsResult.items.length);
        console.log('✅ Turnos con fechas válidas:', relevantShifts.length);

        // Analizar formatos de fecha
        const dateFormats = new Set<string>();
        relevantShifts.forEach(shift => {
          const startTime = shift.startTime;
          if (typeof startTime === 'string') {
            // Detectar si es ISO string
            if (startTime.includes('T') && startTime.includes('Z')) {
              dateFormats.add('ISO_UTC');
            } else if (startTime.includes('T')) {
              dateFormats.add('ISO_LOCAL');
            } else if (startTime.includes('-') && startTime.length === 10) {
              dateFormats.add('DATE_ONLY');
            } else {
              dateFormats.add('OTHER_STRING');
            }
          } else if (typeof startTime === 'number') {
            dateFormats.add('TIMESTAMP');
          } else {
            dateFormats.add('UNKNOWN');
          }
        });
        console.log('📅 Formatos de fecha detectados:', Array.from(dateFormats));

        console.log('🔍 Primeros 5 turnos con fechas originales:', relevantShifts.slice(0, 5).map(s => ({
          id: s.id,
          guard: s.guard,
          property: s.property,
          startTime: s.startTime,
          endTime: s.endTime,
          status: s.status,
          startTimeType: typeof s.startTime,
          endTimeType: typeof s.endTime
        })));

        // Convertir a ShiftEvent
        const shiftEvents = relevantShifts.map(shift => 
          convertToShiftEvent(
            shift, 
            guardsMap[shift.guard], 
            propertiesMap[shift.property]
          )
        );

        console.log('🎯 Turnos convertidos:', shiftEvents.length);
        console.log('🎯 Turnos activos encontrados:', shiftEvents.filter(e => e.status === 'active').length);

        // Verificar específicamente el guardia mock
        const mockShiftEvent = shiftEvents.find(e => e.id === '999');
        if (mockShiftEvent) {
          console.log('🎭 Guardia mock procesado:', {
            id: mockShiftEvent.id,
            guardName: mockShiftEvent.guardName,
            status: mockShiftEvent.status,
            startTime: mockShiftEvent.startTime.toISOString(),
            endTime: mockShiftEvent.endTime.toISOString()
          });
        }

        setShifts(shiftEvents);
      } catch (err) {
        console.error('Error fetching shifts data:', err);
        setError('Error al cargar los datos de turnos');
      } finally {
        setLoading(false);
      }
    }

    fetchShiftsData();
  }, []);

  // Filtrar eventos según los filtros seleccionados
  const filteredEvents = React.useMemo(() => {
    return shifts.filter(event => {
      // Filtro por estado
      if (statusFilter !== "all") {
        if (statusFilter === "active" && event.status !== "active") return false;
        if (statusFilter === "upcoming" && event.status !== "upcoming") return false;
        if (statusFilter === "completed" && event.status !== "completed") return false;
        if (statusFilter === "delayed" && event.status !== "delayed") return false;
      }

      // Filtro por propiedad
      if (propertyFilter !== "all") {
        const propertyId = parseInt(propertyFilter);
        const property = properties.find(p => p.id === propertyId);
        if (property && event.propertyName !== property.name && event.propertyName !== property.alias) {
          return false;
        }
      }

      // Filtro por servicio
      if (serviceFilter !== "all") {
        const serviceId = parseInt(serviceFilter);
        const service = services.find(s => s.id === serviceId);
        if (service && event.serviceName !== service.name) {
          return false;
        }
      }

      return true;
    });
  }, [shifts, statusFilter, propertyFilter, serviceFilter, properties, services]);

  // Separar turnos activos para mostrarlos destacados
  const activeShifts = React.useMemo(() => {
    const active = shifts.filter(event => event.status === 'active');
    console.log('🎯 Turnos activos en useMemo:', active.length, active.map(a => ({
      id: a.id,
      guardName: a.guardName,
      startTime: a.startTime.toISOString(),
      endTime: a.endTime.toISOString()
    })));
    return active;
  }, [shifts]);

  // Ordenar eventos por fecha de inicio
  const sortedEvents = React.useMemo(() => {
    return filteredEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [filteredEvents]);

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Timeline de Turnos en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Cargando turnos...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Timeline de Turnos en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-6 w-6" />
              <span>{error}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (shifts.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Timeline de Turnos en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg font-medium mb-2">No hay turnos programados</div>
              <div className="text-sm">Los turnos aparecerán aquí cuando sean programados</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full h-full flex flex-col">
      <CardHeader className="pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Timeline de Turnos en Tiempo Real
            {activeShifts.length > 0 && (
              <Badge className="bg-green-100 text-green-800 border-green-200 ml-2">
                {activeShifts.length} activos
              </Badge>
            )}
          </CardTitle>
          
          {/* Controles de filtros */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            {/* Filtro por estado */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="upcoming">Próximos</SelectItem>
                <SelectItem value="completed">Completados</SelectItem>
                <SelectItem value="delayed">Retrasados</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro por propiedad */}
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="Propiedad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las propiedades</SelectItem>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id.toString()}>
                    {property.name || property.alias || `Propiedad ${property.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por servicio */}
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="Servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los servicios</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id.toString()}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="grid grid-cols-12 gap-6 h-full">
          {/* Columna izquierda: Turnos Activos */}
          <div className="col-span-4">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  Turnos Activos ({activeShifts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                <ScrollArea className="h-full w-full">
                  <div className="space-y-3">
                    {activeShifts.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <div className="text-sm">No hay turnos activos</div>
                      </div>
                    ) : (
                      activeShifts.map((event) => (
                        <div
                          key={`active-${event.id}`}
                          className="rounded-lg border border-green-200 bg-green-50 p-3 shadow-sm"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-gray-600" />
                            <span className="font-semibold text-gray-900 text-sm">{event.guardName}</span>
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Activo
                            </Badge>
                          </div>
                          
                          <div className="flex items-start gap-2 mb-2">
                            <MapPin className="h-3 w-3 text-gray-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 text-sm">{event.propertyName}</div>
                              <div className="text-xs text-gray-600">{event.propertyAddress}</div>
                            </div>
                          </div>

                          {/* Información adicional del turno */}
                          <div className="mb-3 p-2 bg-white/50 rounded text-xs">
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="h-3 w-3" />
                              <span>Hasta {formatTime(event.endTime)}</span>
                            </div>
                            {event.serviceName && (
                              <div className="text-purple-700">
                                Servicio: {event.serviceName}
                              </div>
                            )}
                            {event.serviceTimeLabel && (
                              <div className="text-purple-600">
                                Horario: {event.serviceTimeLabel}
                              </div>
                            )}
                          </div>

                          {/* Botones de acción */}
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs bg-green-50 border-green-200 hover:bg-green-100"
                              onClick={() => {
                                alert(`Iniciando llamada por video para ${event.guardName}`);
                              }}
                            >
                              <Camera className="h-3 w-3 mr-1" />
                              Video
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs bg-blue-50 border-blue-200 hover:bg-blue-100"
                              onClick={() => {
                                alert(`Mostrando ubicación en tiempo real de ${event.guardName}`);
                              }}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              Mapa
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs bg-purple-50 border-purple-200 hover:bg-purple-100"
                              onClick={() => {
                                alert(`Mostrando reportes de ${event.guardName}`);
                              }}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Reportes
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs bg-orange-50 border-orange-200 hover:bg-orange-100"
                              onClick={() => {
                                alert(`Mostrando actividad de ${event.guardName}`);
                              }}
                            >
                              <Activity className="h-3 w-3 mr-1" />
                              Actividad
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha: Todos los turnos */}
          <div className="col-span-8">
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  Todos los Turnos ({sortedEvents.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0">
                <ScrollArea className="h-full w-full">
                  <div className="relative">
                    {/* Línea principal del timeline */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    <div className="space-y-6 pb-6">
                      {sortedEvents.map((event) => (
                        <div key={event.id} className="relative flex items-start gap-4">
                          {/* Punto del timeline */}
                          <div className={`
                            relative z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 
                            ${event.status === 'active' ? 'bg-green-500 border-green-500' : 
                              event.status === 'upcoming' ? 'bg-blue-500 border-blue-500' :
                              event.status === 'delayed' ? 'bg-red-500 border-red-500' :
                              'bg-gray-400 border-gray-400'}
                          `}>
                            {event.status === 'active' && (
                              <div className="h-2 w-2 rounded-full bg-white"></div>
                            )}
                            {event.status === 'delayed' && (
                              <AlertCircle className="h-2.5 w-2.5 text-white" />
                            )}
                          </div>

                          {/* Contenido del evento */}
                          <div className="flex-1 min-w-0">
                            <div className={`
                              rounded-lg border p-4 transition-all hover:shadow-md
                              ${event.status === 'active' ? 'bg-green-50 border-green-200' :
                                event.status === 'upcoming' ? 'bg-blue-50 border-blue-200' :
                                event.status === 'delayed' ? 'bg-red-50 border-red-200' :
                                'bg-gray-50 border-gray-200'}
                            `}>
                              {/* Header del evento */}
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-600" />
                                  <span className="font-semibold text-gray-900">{event.guardName}</span>
                                </div>
                                <div className="flex gap-2 flex-wrap items-center">
                                  <Badge className={getStatusColor(event.status)}>
                                    {getStatusText(event.status)}
                                  </Badge>
                                  {event.type !== 'regular' && (
                                    <Badge variant="outline" className={getTypeColor(event.type)}>
                                      {event.type === 'emergency' ? 'Emergencia' : 'Horas Extra'}
                                    </Badge>
                                  )}
                                  {event.serviceName && (
                                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 border border-purple-200">
                                      Servicio: {event.serviceName}
                                    </Badge>
                                  )}
                                  
                                  {/* Botones de acción */}
                                  <div className="flex gap-1">
                                    {event.status === 'active' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-xs bg-green-50 border-green-200 hover:bg-green-100"
                                        onClick={() => {
                                          alert(`Iniciando llamada por cámara para ${event.guardName}`);
                                        }}
                                      >
                                        <Camera className="h-3 w-3 mr-1" />
                                        Llamar
                                      </Button>
                                    )}
                                    
                                    {event.status === 'completed' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-xs bg-gray-50 border-gray-200 hover:bg-gray-100"
                                        onClick={() => {
                                          alert(`Generando reporte para el turno completado de ${event.guardName}`);
                                        }}
                                      >
                                        <FileText className="h-3 w-3 mr-1" />
                                        Reporte
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Información de la propiedad */}
                              <div className="flex items-start gap-2 mb-3">
                                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                                <div>
                                  <div className="font-medium text-gray-900">{event.propertyName}</div>
                                  <div className="text-sm text-gray-600">{event.propertyAddress}</div>
                                  {event.serviceTimeLabel && (
                                    <div className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded inline-block mt-1 border border-purple-100">
                                      Horario del servicio: {event.serviceTimeLabel}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Horarios */}
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                                  <span className="text-gray-600">
                                    {formatDate(event.startTime)} {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                  </span>
                                </div>
                                {event.startTime.getDate() !== event.endTime.getDate() && (
                                  <span className="text-xs text-gray-500">
                                    (hasta {formatDate(event.endTime)})
                                  </span>
                                )}
                              </div>

                              {/* Indicador de tiempo restante para turnos activos */}
                              {event.status === 'active' && (
                                <div className="mt-2 text-xs text-green-700 bg-green-100 px-2 py-1 rounded inline-block">
                                  En progreso • Finaliza a las {formatTime(event.endTime)}
                                </div>
                              )}

                              {/* Tiempo hasta el inicio para turnos próximos */}
                              {event.status === 'upcoming' && (
                                <div className="mt-2 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded inline-block">
                                  Inicia en {Math.ceil((event.startTime.getTime() - new Date().getTime()) / (1000 * 60 * 60))} horas
                                </div>
                              )}

                              {/* Alerta para turnos retrasados */}
                              {event.status === 'delayed' && (
                                <div className="mt-2 text-xs text-red-700 bg-red-100 px-2 py-1 rounded inline-block flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Turno retrasado - Requiere atención inmediata
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Leyenda */}
        <div className="mt-4 pt-4 border-t flex-shrink-0">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">En servicio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Próximo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-gray-400"></div>
              <span className="text-gray-600">Completado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">Retrasado</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
