"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MapPin, AlertCircle, Calendar as CalendarIcon } from "lucide-react";

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

interface GuardShiftsTimelineProps {
  guardId?: string;
  guardName?: string;
  shifts?: any[];
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

// Función para determinar el estado del turno
const getShiftStatus = (shift: any): 'active' | 'upcoming' | 'completed' | 'delayed' => {
  const now = new Date();
  const startTime = new Date(shift.start);
  const endTime = new Date(shift.end);

  if (now >= startTime && now <= endTime) {
    return 'active';
  } else if (now < startTime) {
    return 'upcoming';
  } else {
    return 'completed';
  }
};

export function GuardShiftsTimeline({ guardName, shifts = [] }: GuardShiftsTimelineProps) {
  // Convertir turnos a eventos del timeline
  const timelineEvents: ShiftEvent[] = shifts.map(shift => ({
    id: shift.id,
    guardName: guardName || 'Guardia',
    propertyName: shift.property?.name || 'Propiedad sin nombre',
    propertyAddress: shift.property?.address || 'Dirección no disponible',
    startTime: new Date(shift.start),
    endTime: new Date(shift.end),
    status: getShiftStatus(shift),
    type: shift.isOvertime ? 'overtime' : 'regular'
  }));

  // Ordenar eventos por fecha de inicio
  const sortedEvents = timelineEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Filtrar eventos de los últimos 7 días y próximos 7 días
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const recentEvents = sortedEvents.filter(event => 
    event.startTime >= weekAgo && event.startTime <= weekAhead
  );

  if (recentEvents.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-blue-600" />
            Timeline de Turnos (Últimos 7 días)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <CalendarIcon className="h-8 w-8 mb-2" />
            <p className="text-sm">No hay turnos recientes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-blue-600" />
          Timeline de Turnos
        </CardTitle>
        <p className="text-xs text-gray-600">Últimos 7 días y próximos turnos</p>
      </CardHeader>
      <CardContent className="py-0">
        <ScrollArea className="h-[300px] w-full">
          <div className="relative pb-4">
            {/* Línea principal del timeline */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            
            <div className="space-y-4">
              {recentEvents.map((event) => (
                <div key={event.id} className="relative flex items-start gap-3">
                  {/* Punto del timeline */}
                  <div className={`
                    relative z-10 flex h-3 w-3 items-center justify-center rounded-full border-2 mt-1
                    ${event.status === 'active' ? 'bg-green-500 border-green-500' : 
                      event.status === 'upcoming' ? 'bg-blue-500 border-blue-500' :
                      event.status === 'delayed' ? 'bg-red-500 border-red-500' :
                      'bg-gray-400 border-gray-400'}
                  `}>
                    {event.status === 'active' && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
                    )}
                    {event.status === 'delayed' && (
                      <AlertCircle className="h-2 w-2 text-white" />
                    )}
                  </div>

                  {/* Contenido del evento */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className={`
                      rounded-md border p-3 text-xs transition-all hover:shadow-sm
                      ${event.status === 'active' ? 'bg-green-50 border-green-200' :
                        event.status === 'upcoming' ? 'bg-blue-50 border-blue-200' :
                        event.status === 'delayed' ? 'bg-red-50 border-red-200' :
                        'bg-gray-50 border-gray-200'}
                    `}>
                      {/* Header del evento */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-gray-600" />
                          <span className="font-medium text-gray-900 text-xs truncate">
                            {event.propertyName}
                          </span>
                        </div>
                        <Badge className={`${getStatusColor(event.status)} text-xs px-1.5 py-0.5`}>
                          {getStatusText(event.status)}
                        </Badge>
                      </div>

                      {/* Horarios */}
                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatDate(event.startTime)} {formatTime(event.startTime)} - {formatTime(event.endTime)}
                        </span>
                      </div>

                      {/* Tipo de turno si no es regular */}
                      {event.type !== 'regular' && (
                        <Badge variant="outline" className={`${getTypeColor(event.type)} text-xs px-1.5 py-0.5`}>
                          {event.type === 'emergency' ? 'Emergencia' : 'Horas Extra'}
                        </Badge>
                      )}

                      {/* Indicadores específicos por estado */}
                      {event.status === 'active' && (
                        <div className="mt-1.5 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded inline-block">
                          🟢 En progreso
                        </div>
                      )}

                      {event.status === 'upcoming' && (
                        <div className="mt-1.5 text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded inline-block">
                          ⏰ Próximo turno
                        </div>
                      )}

                      {event.status === 'delayed' && (
                        <div className="mt-1.5 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded inline-block flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Retrasado
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {/* Mini leyenda compacta */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Activo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Próximo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-gray-400"></div>
              <span className="text-gray-600">Completado</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
