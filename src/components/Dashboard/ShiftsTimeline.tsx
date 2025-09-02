"use client"

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MapPin, User, AlertCircle, Loader2 } from "lucide-react";
import { listShifts } from "@/lib/services/shifts";
import { listGuards } from "@/lib/services/guard";
import { listProperties } from "@/lib/services/properties";
import type { Shift } from "@/components/Shifts/types";
import type { Guard } from "@/components/Guards/types";
import type { AppProperty } from "@/lib/services/properties";

interface ShiftEvent {
  id: string;
  guardName: string;
  propertyName: string;
  propertyAddress: string;
  startTime: Date;
  endTime: Date;
  status: 'active' | 'upcoming' | 'completed' | 'delayed';
  type: 'regular' | 'overtime' | 'emergency';
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

// Función para determinar el estado del turno basado en las fechas
const determineShiftStatus = (startTime: Date, endTime: Date, originalStatus: string): 'active' | 'upcoming' | 'completed' | 'delayed' => {
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // Si el turno ya terminó
  if (now > end) {
    return 'completed';
  }
  
  // Si el turno está en progreso
  if (now >= start && now <= end) {
    return 'active';
  }
  
  // Si el turno es futuro
  if (now < start) {
    return 'upcoming';
  }
  
  // Si hay algún problema con el estado original, determinar si está retrasado
  if (originalStatus === 'scheduled' && now > start) {
    return 'delayed';
  }
  
  return 'upcoming';
};

// Función para convertir datos de la API a ShiftEvent
const convertToShiftEvent = (shift: Shift, guard: Guard | undefined, property: AppProperty | undefined): ShiftEvent => {
  const startTime = new Date(shift.startTime);
  const endTime = new Date(shift.endTime);
  
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
  
  return {
    id: shift.id.toString(),
    guardName: guard ? `${guard.firstName} ${guard.lastName}` : `Guardia #${shift.guard}`,
    propertyName: property?.name || property?.alias || `Propiedad #${shift.property}`,
    propertyAddress: property?.address || 'Dirección no disponible',
    startTime,
    endTime,
    status: determineShiftStatus(startTime, endTime, shift.status),
    type
  };
};

export function ShiftsTimeline() {
  const [shifts, setShifts] = React.useState<ShiftEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchShiftsData() {
      try {
        setLoading(true);
        setError(null);

        // Obtener turnos de los últimos 2 días y próximos 2 días
        const today = new Date();
        const twoDaysAgo = new Date(today);
        twoDaysAgo.setDate(today.getDate() - 2);
        const twoDaysFromNow = new Date(today);
        twoDaysFromNow.setDate(today.getDate() + 2);

        // Obtener datos en paralelo
        const [shiftsResult, guardsResult, propertiesResult] = await Promise.all([
          listShifts(1, undefined, 50, '-start_time'), // Obtener hasta 50 turnos ordenados por fecha
          listGuards(1, undefined, 100), // Obtener guardias
          listProperties(1, undefined, 100) // Obtener propiedades
        ]);

        // Crear mapas para búsqueda rápida
        const guardsMap = new Map<number, Guard>();
        guardsResult.items.forEach(guard => {
          guardsMap.set(guard.id, guard);
        });

        const propertiesMap = new Map<number, AppProperty>();
        propertiesResult.items.forEach(property => {
          propertiesMap.set(property.id, property);
        });

        // Filtrar turnos relevantes (últimos 2 días y próximos 2 días)
        const relevantShifts = shiftsResult.items.filter(shift => {
          const shiftStart = new Date(shift.startTime);
          return shiftStart >= twoDaysAgo && shiftStart <= twoDaysFromNow;
        });

        // Convertir a ShiftEvent
        const shiftEvents = relevantShifts.map(shift => 
          convertToShiftEvent(
            shift, 
            guardsMap.get(shift.guard), 
            propertiesMap.get(shift.property)
          )
        );

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

  // Ordenar eventos por fecha de inicio
  const sortedEvents = shifts.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Timeline de Turnos en Tiempo Real
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full">
          <div className="relative">
            {/* Línea principal del timeline */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <div className="space-y-6">
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
                        <div className="flex gap-2">
                          <Badge className={getStatusColor(event.status)}>
                            {getStatusText(event.status)}
                          </Badge>
                          {event.type !== 'regular' && (
                            <Badge variant="outline" className={getTypeColor(event.type)}>
                              {event.type === 'emergency' ? 'Emergencia' : 'Horas Extra'}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Información de la propiedad */}
                      <div className="flex items-start gap-2 mb-3">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div>
                          <div className="font-medium text-gray-900">{event.propertyName}</div>
                          <div className="text-sm text-gray-600">{event.propertyAddress}</div>
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

        {/* Leyenda */}
        <div className="mt-4 pt-4 border-t">
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
