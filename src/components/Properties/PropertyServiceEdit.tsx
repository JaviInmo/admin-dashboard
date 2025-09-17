"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { updateService, createService } from "@/lib/services/services";
import { useI18n } from "@/i18n";
import type { AppProperty } from "@/lib/services/properties";
import { listProperties } from "@/lib/services/properties";
import type { Service } from "@/components/Services/types";
import { Paintbrush } from 'lucide-react';

interface PropertyServiceEditProps {
  service: Service;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
  compact?: boolean;
}

export default function PropertyServiceEdit({
  service,
  open,
  onClose,
  onUpdated,
  compact = false,
}: PropertyServiceEditProps) {
  const { TEXT } = useI18n();
  const qc = useQueryClient();

  const [loading, setLoading] = React.useState(false);

  const [name, setName] = React.useState<string>(() => service.name ?? "");
  const [description, setDescription] = React.useState<string>(
    () => service.description ?? ""
  );

  const [propertyId, setPropertyId] = React.useState<number | null>(
    () => service.assignedProperty ?? null
  );
  const [propertySelectedLabel, setPropertySelectedLabel] =
    React.useState<string>(() => service.propertyName ?? "");
  const [propertySearchTerm, setPropertySearchTerm] =
    React.useState<string>("");

  const [rate, setRate] = React.useState<string>(() => service.rate ?? "");
  const [monthlyBudget, setMonthlyBudget] = React.useState<string>(
    () => service.monthlyBudget ?? ""
  );
  const [totalHours, setTotalHours] = React.useState<string>(
    () => service.totalHours ?? ""
  );
  const [contractStartDate, setContractStartDate] = React.useState<string>(
    () => service.contractStartDate ?? ""
  );
  const [start_time, setStart_time] = React.useState<string>(
    () => service.startTime ?? ""
  );
  const [end_time, setEnd_time] = React.useState<string>(
    () => service.endTime ?? ""
  );
  const [isActive, setIsActive] = React.useState<boolean>(
    () => service.isActive ?? true
  );
  const [recurrent, setRecurrent] = React.useState<boolean>(
    () => service.recurrent ?? false
  );

  const [schedule, setSchedule] = React.useState<string[]>(() =>
    Array.isArray(service.schedule) ? service.schedule : ([] as string[])
  );
  const [scheduleInput, setScheduleInput] = React.useState<string>("");

  // Estados de control para cálculos automáticos
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [lastModifiedField, setLastModifiedField] = React.useState<
    "rate" | "hours" | "budget" | null
  >(null);

  // Funciones helper para formateo de moneda
  const formatCurrency = (value: string, isEditing: boolean = false) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    if (isEditing) {
      // Durante la edición, solo mostrar el valor limpio
      return cleaned;
    }
    // Solo formatear cuando no está siendo editado y tiene valor
    const num = parseFloat(cleaned);
    return num > 0 ? `$${num.toFixed(2)}` : cleaned;
  };

  const cleanCurrency = (value: string) => {
    return value.replace(/[^0-9.]/g, "");
  };

  const isValidNumber = (value: string) => /^\d*\.?\d*$/.test(value);

  const calculateMonthlyBudget = (hours: string, rate: string) => {
    const h = parseFloat(hours);
    const r = parseFloat(cleanCurrency(rate));
    if (h > 0 && r > 0) {
      return (h * r).toFixed(2);
    }
    return "";
  };

  // Estados para manejar el foco de los inputs
  const [rateInputFocused, setRateInputFocused] = React.useState(false);
  const [budgetInputFocused, setBudgetInputFocused] = React.useState(false);

  // Estados para el desplegable de propiedades
  const [propertyDropdownOpen, setPropertyDropdownOpen] = React.useState(false);
  const [propertySearchInput, setPropertySearchInput] = React.useState("");

  // Estado para el tipo de schedule
  const [scheduleType, setScheduleType] = React.useState<"specific" | "period">(
    "specific"
  );
  const [scheduleView, setScheduleView] = React.useState<
    "classic" | "calendar"
  >("classic");

  // Estados adicionales para período
  const [periodStart, setPeriodStart] = React.useState<string>("");
  const [periodEnd, setPeriodEnd] = React.useState<string>("");

  // Estados para horarios del calendario
  const [calendarStartTime, setCalendarStartTime] =
    React.useState<string>("09:00");
  const [calendarEndTime, setCalendarEndTime] = React.useState<string>("17:00");

  // Estado para manejar horas individuales de cada fecha
  const [dateTimeMap, setDateTimeMap] = React.useState<{
    [date: string]: { start: string; end: string };
  }>({});

  // Estado para el filtro de fechas
  const [dateFilter, setDateFilter] = React.useState<"day" | "week" | "month">(
    "day"
  );

  // Estado para tracking de período actual en modo período
  const [currentPeriodStart, setCurrentPeriodStart] = React.useState<
    string | null
  >(null);

  // Estado para el ancho del modal
  const [modalWidth, setModalWidth] = React.useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("propertyServiceEdit-modalWidth");
      return saved ? parseInt(saved, 10) : 1024; // Default 1024px
    }
    return 1024;
  });

  // Estados para el redimensionamiento por arrastre
  const [isResizing, setIsResizing] = React.useState(false);
  const [resizeStartX, setResizeStartX] = React.useState(0);
  const [resizeStartWidth, setResizeStartWidth] = React.useState(0);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // cuando cambie el service (nuevo open con otro service), prefillea valores
    if (!open) return;
    
    // Calcular fechas por defecto (primer y último día del año actual)
    const currentYear = new Date().getFullYear();
    const defaultStartDate = `${currentYear}-01-01`;
    const defaultEndDate = `${currentYear}-12-31`;
    
    setName(service.name ?? "");
    setDescription(service.description ?? "");
    setPropertyId(service.assignedProperty ?? null);
    setPropertySelectedLabel(service.propertyName ?? "");
    setRate(cleanCurrency(service.rate ?? ""));
    setMonthlyBudget(cleanCurrency(service.monthlyBudget ?? ""));
    setTotalHours(service.totalHours ?? "");
    setContractStartDate(service.contractStartDate ?? "");
    // Si no hay fechas definidas, usar el año actual por defecto
    setStart_time(service.startTime ?? defaultStartDate);
    setEnd_time(service.endTime ?? defaultEndDate);
    setIsActive(service.isActive ?? true);
    setRecurrent(service.recurrent ?? false);
    setSchedule(Array.isArray(service.schedule) ? service.schedule : []);
    setScheduleInput("");
    setLastModifiedField(null); // Reset del campo modificado
    setPropertyDropdownOpen(false); // Cerrar dropdown
    setPropertySearchInput(""); // Limpiar búsqueda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, service.id]);

  React.useEffect(() => {
    const t = setTimeout(
      () => setPropertySearchTerm(propertySearchInput.trim()),
      300
    );
    return () => clearTimeout(t);
  }, [propertySearchInput]);

  // Effect para cálculos automáticos
  React.useEffect(() => {
    if (isCalculating) return; // Evitar loops infinitos

    if (lastModifiedField === "hours" || lastModifiedField === "rate") {
      const calculated = calculateMonthlyBudget(totalHours, rate);
      if (calculated && calculated !== cleanCurrency(monthlyBudget)) {
        setIsCalculating(true);
        setMonthlyBudget(calculated);
        setTimeout(() => setIsCalculating(false), 100);
      }
    }
  }, [
    totalHours,
    rate,
    lastModifiedField,
    isCalculating,
    monthlyBudget,
    calculateMonthlyBudget,
    cleanCurrency,
  ]);

  // Effect para cerrar dropdown al hacer clic fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-property-dropdown]")) {
        setPropertyDropdownOpen(false);
      }
    };

    if (propertyDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [propertyDropdownOpen]);

  const propsQuery = useQuery<AppProperty[], Error>({
    queryKey: ["properties-suggest", propertySearchTerm],
    queryFn: async () => {
      const res = await listProperties(
        1,
        propertySearchTerm || undefined,
        10,
        "name"
      );
      const anyRes = res as any;
      if (Array.isArray(anyRes)) return anyRes as AppProperty[];
      return (anyRes.results ??
        anyRes.data ??
        anyRes.items ??
        []) as AppProperty[];
    },
    enabled: propertyDropdownOpen || propertySearchTerm.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  const addScheduleDate = () => {
    if (!scheduleInput) return;
    if (!schedule.includes(scheduleInput)) {
      setSchedule((s) => [...s, scheduleInput]);
      setScheduleInput("");
    } else {
      toast("Date already added");
    }
  };

  const removeScheduleDate = (d: string) => {
    setSchedule((s) => s.filter((x) => x !== d));
    // También remover del mapa de horas
    setDateTimeMap((prev) => {
      const newMap = { ...prev };
      delete newMap[d];
      return newMap;
    });
  };

  // Función para obtener horas de una fecha específica
  const getDateTimes = (date: string) => {
    return (
      dateTimeMap[date] || { start: calendarStartTime, end: calendarEndTime }
    );
  };

  // Función para actualizar horas de una fecha específica
  // NOTA: Comentada porque ahora las horas se muestran como texto de solo lectura
  // const updateDateTime = (date: string, field: 'start' | 'end', value: string) => {
  //   setDateTimeMap(prev => ({
  //     ...prev,
  //     [date]: {
  //       ...getDateTimes(date),
  //       [field]: value
  //     }
  //   }));
  // };

  // Función para validar si una fecha está dentro del rango permitido
  const isDateOutOfRange = (date: string): boolean => {
    if (!periodStart || !periodEnd) return false;
    return date < periodStart || date > periodEnd;
  };

  // Función para obtener todas las fechas de un día de la semana específico en el rango
  const getSpecificWeekdayInRange = (clickedDate: Date): string[] => {
    // Determinar el rango de fechas a usar
    let startDate: Date, endDate: Date;

    if (start_time && end_time) {
      // Usar fechas de restricción si están disponibles
      startDate = new Date(start_time);
      endDate = new Date(end_time);
    } else if (periodStart && periodEnd) {
      // Usar fechas del período si están disponibles
      startDate = new Date(periodStart);
      endDate = new Date(periodEnd);
    } else {
      // Usar un rango de 6 meses alrededor de la fecha clickeada
      startDate = new Date(clickedDate);
      startDate.setMonth(startDate.getMonth() - 3);
      endDate = new Date(clickedDate);
      endDate.setMonth(endDate.getMonth() + 3);
    }

    return getWeekdayDatesInRange(clickedDate, startDate, endDate);
  };

  // Función auxiliar para obtener todos los días de la semana en un rango
  const getWeekdayDatesInRange = (
    referenceDate: Date,
    startDate: Date,
    endDate: Date
  ): string[] => {
    const targetWeekday = referenceDate.getDay();
    const dates = [];

    // Encontrar el primer día de la semana objetivo
    const current = new Date(startDate);
    while (current.getDay() !== targetWeekday && current <= endDate) {
      current.setDate(current.getDate() + 1);
    }

    // Agregar todas las ocurrencias de ese día de la semana
    while (current <= endDate) {
      const dateStr = convertDatesToStringArray([current])[0];
      dates.push(dateStr);
      current.setDate(current.getDate() + 7); // Siguiente semana
    }

    return dates;
  };

  // Función para obtener todas las fechas de un día del mes específico en el rango
  const getSpecificMonthdayInRange = (clickedDate: Date): string[] => {
    // Determinar el rango de fechas a usar
    let startDate: Date, endDate: Date;

    if (start_time && end_time) {
      // Usar fechas de restricción si están disponibles
      startDate = new Date(start_time);
      endDate = new Date(end_time);
    } else if (periodStart && periodEnd) {
      // Usar fechas del período si están disponibles
      startDate = new Date(periodStart);
      endDate = new Date(periodEnd);
    } else {
      // Usar un rango de 12 meses alrededor de la fecha clickeada
      startDate = new Date(clickedDate);
      startDate.setFullYear(startDate.getFullYear() - 1);
      endDate = new Date(clickedDate);
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    return getMonthdayDatesInRange(clickedDate, startDate, endDate);
  };

  // Función auxiliar para obtener todos los días del mes en un rango
  const getMonthdayDatesInRange = (
    referenceDate: Date,
    startDate: Date,
    endDate: Date
  ): string[] => {
    const targetDay = referenceDate.getDate();
    const dates = [];

    const current = new Date(startDate);
    current.setDate(1); // Ir al primer día del mes

    while (current <= endDate) {
      // Verificar si el día objetivo existe en este mes
      const lastDayOfMonth = new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        0
      ).getDate();
      if (targetDay <= lastDayOfMonth) {
        const targetDate = new Date(
          current.getFullYear(),
          current.getMonth(),
          targetDay
        );
        if (targetDate >= startDate && targetDate <= endDate) {
          const dateStr = convertDatesToStringArray([targetDate])[0];
          dates.push(dateStr);
        }
      }

      // Ir al siguiente mes
      current.setMonth(current.getMonth() + 1);
    }

    return dates;
  };

  const clearPropertySelection = () => {
    setPropertyId(null);
    setPropertySelectedLabel("");
    setPropertyDropdownOpen(false);
    setPropertySearchInput("");
  };

  // Funciones de utilidad para el schedule
  const convertStringArrayToDates = (dateStrings: string[]): Date[] => {
    return dateStrings
      .map((dateStr) => {
        // Crear fecha local sin problemas de zona horaria
        const [year, month, day] = dateStr.split("-").map(Number);
        return new Date(year, month - 1, day);
      })
      .filter((date) => !isNaN(date.getTime()));
  };

  const convertDatesToStringArray = (dates: Date[]): string[] => {
    return dates.map((date) => {
      // Usar métodos locales para evitar problemas de zona horaria
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    });
  };

  const generatePeriodDates = (
    startDate: string,
    endDate: string
  ): string[] => {
    if (!startDate || !endDate) return [];

    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    const dates: string[] = [];

    for (
      let date = new Date(start);
      date <= end;
      date.setDate(date.getDate() + 1)
    ) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);
    }

    return dates;
  };

  // Funciones de replicación de patrones
  const replicateWeeklyPattern = (selectedDates: string[]): string[] => {
    if (selectedDates.length === 0) return selectedDates;

    // Determinar el rango de fechas a usar
    let startDate: string, endDate: string;

    if (start_time && end_time) {
      // Usar fechas de restricción si están disponibles
      startDate = start_time;
      endDate = end_time;
    } else if (periodStart && periodEnd) {
      // Usar fechas del período si están disponibles
      startDate = periodStart;
      endDate = periodEnd;
    } else {
      // Usar un rango de 6 meses desde la primera fecha seleccionada
      const firstDate = new Date(selectedDates[0]);
      startDate = new Date(firstDate.getFullYear(), firstDate.getMonth() - 1, 1)
        .toISOString()
        .split("T")[0];
      endDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + 5, 0)
        .toISOString()
        .split("T")[0];
    }

    const allPeriodDates = generatePeriodDates(startDate, endDate);
    const replicatedDates = new Set<string>();

    // Para cada fecha seleccionada, encontrar todas las fechas en el período que caigan en el mismo día de la semana
    selectedDates.forEach((selectedDate) => {
      const selectedDay = new Date(selectedDate + "T00:00:00").getDay();

      allPeriodDates.forEach((periodDate) => {
        const periodDay = new Date(periodDate + "T00:00:00").getDay();
        if (periodDay === selectedDay) {
          replicatedDates.add(periodDate);
        }
      });
    });

    return Array.from(replicatedDates).sort();
  };

  const replicateMonthlyPattern = (selectedDates: string[]): string[] => {
    if (selectedDates.length === 0) return selectedDates;

    // Determinar el rango de fechas a usar
    let startDate: string, endDate: string;

    if (start_time && end_time) {
      // Usar fechas de restricción si están disponibles
      startDate = start_time;
      endDate = end_time;
    } else if (periodStart && periodEnd) {
      // Usar fechas del período si están disponibles
      startDate = periodStart;
      endDate = periodEnd;
    } else {
      // Usar un rango de 12 meses desde la primera fecha seleccionada
      const firstDate = new Date(selectedDates[0]);
      startDate = new Date(firstDate.getFullYear() - 1, firstDate.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      endDate = new Date(firstDate.getFullYear() + 1, firstDate.getMonth(), 0)
        .toISOString()
        .split("T")[0];
    }

    const allPeriodDates = generatePeriodDates(startDate, endDate);
    const replicatedDates = new Set<string>();

    // Para cada fecha seleccionada, encontrar todas las fechas en el período que caigan en el mismo día del mes
    selectedDates.forEach((selectedDate) => {
      const selectedDay = new Date(selectedDate + "T00:00:00").getDate();

      allPeriodDates.forEach((periodDate) => {
        const periodDay = new Date(periodDate + "T00:00:00").getDate();
        if (periodDay === selectedDay) {
          replicatedDates.add(periodDate);
        }
      });
    });

    return Array.from(replicatedDates).sort();
  };

  // Funciones para selección por arrastre
  const getDatesInRange = (startDate: string, endDate: string): string[] => {
    const start = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");

    if (start > end) {
      // Si la fecha de inicio es mayor que la de fin, intercambiar
      return getDatesInRange(endDate, startDate);
    }

    const dates: string[] = [];
    const current = new Date(start);

    while (current <= end) {
      const dateStr = convertDatesToStringArray([current])[0];
      dates.push(dateStr);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  // Función para calcular horas totales de trabajo
  const calculateTotalHours = (): number => {
    let totalMinutes = 0;

    schedule.forEach((date) => {
      const timeData = dateTimeMap[date];
      if (timeData && timeData.start && timeData.end) {
        // Convertir horas a minutos para cálculo más preciso
        const [startHour, startMin] = timeData.start.split(":").map(Number);
        const [endHour, endMin] = timeData.end.split(":").map(Number);

        const startTotalMinutes = startHour * 60 + startMin;
        const endTotalMinutes = endHour * 60 + endMin;

        // Manejar el caso donde el turno cruza medianoche
        let dayMinutes;
        if (endTotalMinutes >= startTotalMinutes) {
          dayMinutes = endTotalMinutes - startTotalMinutes;
        } else {
          // Turno nocturno (cruza medianoche)
          dayMinutes = 24 * 60 - startTotalMinutes + endTotalMinutes;
        }

        totalMinutes += dayMinutes;
      }
    });

    // Convertir minutos totales a horas decimales
    return totalMinutes / 60;
  };

  // Función para formatear horas totales como texto legible
  const formatTotalHours = (): string => {
    const totalHours = calculateTotalHours();
    if (totalHours === 0) return "0 ";

    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);

    if (minutes === 0) {
      return `${hours} hora${hours !== 1 ? "s" : ""}`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  const generatePeriod = () => {
    if (!periodStart || !periodEnd) return;
    const newDates = generatePeriodDates(periodStart, periodEnd);
    setSchedule(newDates);

    // Si estamos en modo calendar, también inicializar el mapa de horarios para todas las fechas
    if (scheduleView === "calendar") {
      const newDateTimeMap: { [key: string]: { start: string; end: string } } =
        {};
      newDates.forEach((date) => {
        newDateTimeMap[date] = {
          start: calendarStartTime || "",
          end: calendarEndTime || "",
        };
      });
      setDateTimeMap(newDateTimeMap);
    }
  };

  // Función para generar resumen del schedule en lenguaje humano
  const generateScheduleSummary = (): string => {
    if (schedule.length === 0) {
      return "No hay fechas programadas para este servicio.";
    }

    // Filtrar fechas que están dentro del rango permitido (start_time - end_time)
    let validDates = schedule;
    if (start_time && end_time) {
      const startDate = new Date(start_time);
      const endDate = new Date(end_time);

      validDates = schedule.filter((dateStr) => {
        const date = new Date(dateStr);
        return date >= startDate && date <= endDate;
      });
    }

    if (validDates.length === 0) {
      return "Las fechas programadas están fuera del período de servicio permitido.";
    }

    const totalDates = validDates.length;
    const totalHours = formatTotalHours();

    // Analizar patrones de fechas válidas
    const dates = validDates
      .map((d) => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    let summary = "";

    // Información del rango permitido
    if (start_time && end_time) {
      summary += `Servicio planificado del ${new Date(
        start_time
      ).toLocaleDateString("es-ES")} al ${new Date(
        end_time
      ).toLocaleDateString("es-ES")}. `;
    }

    // Tipo de programación
    if (scheduleType === "specific") {
      summary += "Programado para fechas específicas. ";
    } else {
      summary += `Programado por período del ${
        periodStart ? new Date(periodStart).toLocaleDateString("es-ES") : ""
      } al ${
        periodEnd ? new Date(periodEnd).toLocaleDateString("es-ES") : ""
      }. `;
    }

    // Cantidad y rango de fechas válidas
    if (totalDates === 1) {
      summary += `Una sola fecha: ${firstDate.toLocaleDateString("es-ES")}. `;
    } else {
      summary += `${totalDates} fechas desde ${firstDate.toLocaleDateString(
        "es-ES"
      )} hasta ${lastDate.toLocaleDateString("es-ES")}. `;
    }

    // Análisis de patrón (días de la semana más comunes) solo para fechas válidas
    const dayCount: { [key: number]: number } = {};
    dates.forEach((date) => {
      const day = date.getDay();
      dayCount[day] = (dayCount[day] || 0) + 1;
    });

    const dayNames = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];

    // Detectar patrones específicos de días laborales
    const workingDays = Object.keys(dayCount).map(Number).sort();
    let dayPattern = "";

    if (workingDays.length > 0 && totalDates > 2) {
      // Función para detectar rangos consecutivos
      const getConsecutiveRanges = (days: number[]): string => {
        const ranges: string[] = [];
        let start = days[0];
        let end = days[0];

        for (let i = 1; i < days.length; i++) {
          if (days[i] === end + 1) {
            // Día consecutivo
            end = days[i];
          } else {
            // Fin de secuencia, agregar rango
            if (start === end) {
              ranges.push(dayNames[start]);
            } else if (end === start + 1) {
              ranges.push(`${dayNames[start]} y ${dayNames[end]}`);
            } else {
              ranges.push(`de ${dayNames[start]} a ${dayNames[end]}`);
            }
            start = days[i];
            end = days[i];
          }
        }

        // Agregar el último rango
        if (start === end) {
          ranges.push(dayNames[start]);
        } else if (end === start + 1) {
          ranges.push(`${dayNames[start]} y ${dayNames[end]}`);
        } else {
          ranges.push(`de ${dayNames[start]} a ${dayNames[end]}`);
        }

        // Unir rangos con comas y "y"
        if (ranges.length === 1) {
          return ranges[0];
        } else if (ranges.length === 2) {
          return ranges.join(" y ");
        } else {
          return (
            ranges.slice(0, -1).join(", ") + " y " + ranges[ranges.length - 1]
          );
        }
      };

      // Patrones especiales primero
      const isWeekdays = workingDays.every((day) => day >= 1 && day <= 5); // Lunes a viernes
      const isWeekends = workingDays.every((day) => day === 0 || day === 6); // Fines de semana

      if (
        isWeekdays &&
        workingDays.length === 5 &&
        workingDays.join(",") === "1,2,3,4,5"
      ) {
        dayPattern = "de lunes a viernes";
      } else if (
        isWeekdays &&
        workingDays.length === 6 &&
        workingDays.join(",") === "1,2,3,4,5,6"
      ) {
        dayPattern = "de lunes a sábado";
      } else if (isWeekends) {
        dayPattern = "fines de semana";
      } else if (workingDays.length === 1) {
        dayPattern = `solo ${dayNames[workingDays[0]]}s`;
      } else if (workingDays.length <= 5) {
        // Para grupos pequeños, usar la lógica de rangos consecutivos
        dayPattern = getConsecutiveRanges(workingDays);
      } else {
        // Para más de 5 días, mostrar los más frecuentes
        const mostCommonDays = Object.entries(dayCount)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([day]) => dayNames[parseInt(day)]);
        dayPattern = `principalmente ${mostCommonDays
          .join(", ")
          .replace(/, ([^,]*)$/, " y $1")}`;
      }

      if (dayPattern) {
        summary += `Horario: ${dayPattern}. `;
      }
    }

    // Información de horarios (solo para fechas válidas)
    const uniqueSchedules = new Set();
    validDates.forEach((dateStr) => {
      const times = dateTimeMap[dateStr];
      if (times && times.start && times.end) {
        uniqueSchedules.add(`${times.start}-${times.end}`);
      }
    });

    if (uniqueSchedules.size > 0) {
      if (uniqueSchedules.size === 1) {
        const schedule = Array.from(uniqueSchedules)[0];
        summary += `Horario: ${schedule}. `;
      } else {
        summary += `Horarios variables (${uniqueSchedules.size} diferentes). `;
      }
    }

    // Total de horas
    summary += `Total de trabajo: ${totalHours}.`;

    return summary;
  };

  // Función para determinar si una fecha debe estar deshabilitada
  const isDateDisabled = (date: Date): boolean => {
    // Si no hay rango definido (start_time y end_time), todas las fechas están habilitadas
    if (!start_time || !end_time) {
      return false;
    }

    // Convertir start_time y end_time a objetos Date para comparación
    const [startYear, startMonth, startDay] = start_time
      .split("-")
      .map(Number);
    const [endYear, endMonth, endDay] = end_time.split("-").map(Number);

    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);

    // Deshabilitar fechas fuera del rango
    return date < startDate || date > endDate;
  };

  // Funciones para manejar el redimensionamiento por arrastre
  const handleModalWidthChange = (newWidth: number) => {
    const clampedWidth = Math.max(400, Math.min(1600, newWidth)); // Min 400px, Max 1600px
    setModalWidth(clampedWidth);
    localStorage.setItem(
      "propertyServiceEdit-modalWidth",
      clampedWidth.toString()
    );
  };

  const handleResizeStart = (e: React.MouseEvent, side: "left" | "right") => {
    e.preventDefault();
    setIsResizing(true);
    setResizeStartX(e.clientX);
    setResizeStartWidth(modalWidth);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = moveEvent.clientX - resizeStartX;
      let newWidth;

      if (side === "right") {
        newWidth = resizeStartWidth + deltaX;
      } else {
        // left
        newWidth = resizeStartWidth - deltaX;
      }

      handleModalWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  // Manejadores de cambio con lógica de cálculo
  const handleTotalHoursChange = (value: string) => {
    if (isValidNumber(value) || value === "") {
      setTotalHours(value);
      setLastModifiedField("hours");
    }
  };

  const handleRateChange = (value: string) => {
    const cleaned = cleanCurrency(value);
    if (isValidNumber(cleaned) || cleaned === "") {
      setRate(cleaned);
      setLastModifiedField("rate");
    }
  };

  const handleMonthlyBudgetChange = (value: string) => {
    const cleaned = cleanCurrency(value);
    if (isValidNumber(cleaned) || cleaned === "") {
      setMonthlyBudget(cleaned);
      setLastModifiedField("budget");
      // Si se modifica manualmente el presupuesto, resetear tarifa
      if (parseFloat(cleaned) > 0 && parseFloat(cleanCurrency(rate)) > 0) {
        setRate("0");
        toast.info(
          "Tarifa reseteada a $0 por modificación manual del presupuesto"
        );
      }
    }
  };

  const handleUpdate = async () => {
    const isCreate = service.id === 0;
    
    // Para creación, necesitamos CreateServicePayload; para edición, UpdateServicePayload
    const payload: any = {};

    if (name !== undefined)
      payload.name = name.trim() === "" ? undefined : name.trim();
    if (description !== undefined)
      payload.description = description.trim() === "" ? "" : description.trim();
    payload.guard = null; // No guardia en vista de propiedades
    payload.assigned_property = propertyId ?? undefined;
    payload.rate = rate === "" ? undefined : cleanCurrency(rate);
    payload.monthly_budget =
      monthlyBudget === "" ? undefined : cleanCurrency(monthlyBudget);
    payload.total_hours = totalHours === "" ? undefined : totalHours;
    payload.contract_start_date =
      contractStartDate === "" ? undefined : contractStartDate;
    
    // Combinar fecha + hora para enviar datetime completo
    const formatDateTime = (date: string, time: string): string | undefined => {
      if (!date || date === "") return undefined;
      if (!time || time === "") return `${date} 00:00:00`;
      
      // El formato es hh:mm[:ss[.uuuuuu]] - segundos y microsegundos son opcionales
      // Simplemente usar el tiempo tal como viene del input
      return `${date} ${time}`;
    };
    
    payload.start_time = formatDateTime(start_time, calendarStartTime);
    payload.end_time = formatDateTime(end_time, calendarEndTime);
    payload.schedule = schedule.length > 0 ? schedule : undefined;
    payload.recurrent = recurrent;
    payload.is_active = isActive;

    try {
      setLoading(true);
      
      if (isCreate) {
        // Crear nuevo servicio
        await createService(payload);
        toast.success(TEXT?.services?.messages?.created ?? "Service created");
      } else {
        // Actualizar servicio existente
        await updateService(service.id, payload);
        toast.success(TEXT?.services?.messages?.updated ?? "Service updated");
      }
      
      qc.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) && q.queryKey[0] === "services",
      });
      if (onUpdated) {
        const maybe = onUpdated();
        if (maybe && typeof (maybe as any).then === "function") await maybe;
      }
      onClose();
    } catch (err: any) {
      const action = isCreate ? "create" : "update";
      const msg =
        err?.message ??
        TEXT?.services?.errors?.updateFailed ??
        `Failed to ${action} service`;
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const propertyLabel = (p: AppProperty) => {
    const primaryName = p.alias || p.name || `Property #${p.id}`;
    const secondaryName = p.alias && p.name ? ` (${p.name})` : "";
    return `${primaryName}${secondaryName}${
      p.address ? ` — ${p.address}` : ""
    }`;
  };

  // compact sizing for nested dialogs
  const dialogClass = compact
    ? "w-full max-h-[60vh] overflow-auto gap-0"
    : "w-full max-h-[80vh] overflow-auto gap-0";
  const titleClass = compact ? "text-base" : "text-lg";

  const dialogStyle = {
    width: `${modalWidth}px`,
    maxWidth: "95vw", // No exceder el 95% del viewport
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className={dialogClass}
        style={dialogStyle}
        ref={dialogRef}
      >
        {/* Zona de redimensionamiento izquierda */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/20 transition-colors z-10"
          onMouseDown={(e) => handleResizeStart(e, "left")}
          title="Arrastra para redimensionar"
        />

        {/* Zona de redimensionamiento derecha */}
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/20 transition-colors z-10"
          onMouseDown={(e) => handleResizeStart(e, "right")}
          title="Arrastra para redimensionar"
        />

        <DialogHeader>
          <DialogTitle className={`${titleClass} pl-2`}>
            {TEXT?.services?.edit?.title ?? "Edit Service"} — Property View
          </DialogTitle>
        </DialogHeader>

        <div className="px-2 py-2">
          {/* Layout de dos columnas principales con relación 2/3 */}
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
            {/* Columna izquierda - Información principal (2/5) */}
            <div className="lg:col-span-3 space-y-2 pr-3 ">
              <div>
                <label className="text-sm ">
                  {TEXT?.services?.fields?.name ?? "Name"}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  className=""
                />
              </div>

              <div>
                <label className="text-sm ">
                  {TEXT?.services?.fields?.description ?? "Description"}
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                  className=""
                />
              </div>

              {/* Property combobox mejorado */}
              <div data-property-dropdown>
                <label className="text-sm">
                  {TEXT?.services?.fields?.assignedProperty ?? "Property"}
                </label>
                <div className="relative">
                  <Input
                    value={propertySelectedLabel || "Seleccionar propiedad..."}
                    onClick={() => {
                      setPropertyDropdownOpen(!propertyDropdownOpen);
                      if (!propertyDropdownOpen) {
                        setPropertySearchInput("");
                      }
                    }}
                    readOnly
                    placeholder={
                      TEXT?.services?.placeholders?.property ??
                      "Click to select property"
                    }
                    className="cursor-pointer"
                    aria-autocomplete="list"
                  />

                  {propertyDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-60 overflow-hidden text-sm">
                      {/* Buscador en la primera fila */}
                      <div className="p-2 border-b">
                        <Input
                          value={propertySearchInput}
                          onChange={(e) =>
                            setPropertySearchInput(e.currentTarget.value)
                          }
                          placeholder="Buscar propiedad..."
                          className="h-8"
                          autoFocus
                        />
                      </div>

                      {/* Lista de propiedades */}
                      <div className="max-h-40 overflow-auto">
                        {propsQuery.isFetching && (
                          <div className="p-2 text-sm text-muted-foreground">
                            {TEXT?.common?.loading ?? "Loading..."}
                          </div>
                        )}

                        {Array.isArray(propsQuery.data) &&
                        propsQuery.data.length > 0
                          ? propsQuery.data.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-accent/50 border-b border-border/30 last:border-b-0"
                                onClick={() => {
                                  setPropertyId(p.id);
                                  const lbl = propertyLabel(p);
                                  setPropertySelectedLabel(lbl);
                                  setPropertyDropdownOpen(false);
                                  setPropertySearchInput("");
                                }}
                              >
                                <div className="font-medium">
                                  {p.alias || p.name || `Property #${p.id}`}
                                </div>
                                {p.alias && p.name && (
                                  <div className="text-xs text-muted-foreground">
                                    {p.name}
                                  </div>
                                )}
                                {p.address && (
                                  <div className="text-xs text-muted-foreground">
                                    {p.address}
                                  </div>
                                )}
                              </button>
                            ))
                          : !propsQuery.isFetching && (
                              <div className="p-2 text-sm text-muted-foreground">
                                {propertySearchInput
                                  ? "No se encontraron propiedades"
                                  : "No hay propiedades disponibles"}
                              </div>
                            )}
                      </div>
                    </div>
                  )}

                  {propertyId !== null && (
                    <button
                      type="button"
                      aria-label="Clear property"
                      onClick={clearPropertySelection}
                      className="absolute right-8 top-2 text-sm opacity-70"
                    >
                      ✕
                    </button>
                  )}

                  {/* Icono de flecha */}
                  <button
                    type="button"
                    onClick={() =>
                      setPropertyDropdownOpen(!propertyDropdownOpen)
                    }
                    className="absolute right-2 top-2 text-sm opacity-70"
                  >
                    {propertyDropdownOpen ? "▲" : "▼"}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-sm">
                    {TEXT?.services?.fields?.totalHours ?? "Cant. Hrs"}
                  </label>
                  <Input
                    value={totalHours}
                    onChange={(e) =>
                      handleTotalHoursChange(e.currentTarget.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm">
                    {TEXT?.services?.fields?.rate ?? "Rate / hr"}
                  </label>
                  <Input
                    value={formatCurrency(rate, rateInputFocused)}
                    onChange={(e) => handleRateChange(e.currentTarget.value)}
                    onFocus={() => setRateInputFocused(true)}
                    onBlur={() => setRateInputFocused(false)}
                    placeholder="$0.00"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-sm">
                    {TEXT?.services?.fields?.monthlyBudget ?? "Monthly budget"}
                  </label>
                  <Input
                    value={formatCurrency(monthlyBudget, budgetInputFocused)}
                    onChange={(e) =>
                      handleMonthlyBudgetChange(e.currentTarget.value)
                    }
                    onFocus={() => setBudgetInputFocused(true)}
                    onBlur={() => setBudgetInputFocused(false)}
                    placeholder="$0.00"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm">
                    {TEXT?.services?.fields?.contractStartDate ??
                      "Contract Date"}
                  </label>
                  <Input
                    type="date"
                    value={contractStartDate}
                    onChange={(e) =>
                      setContractStartDate(e.currentTarget.value)
                    }
                  />
                </div>
              </div>
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm">
                      {TEXT?.services?.fields?.startTime ?? "Start"}
                    </label>
                    <Input
                      type="date"
                      value={start_time}
                      onChange={(e) => setStart_time(e.currentTarget.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm">
                      {TEXT?.services?.fields?.endTime ?? "End"}
                    </label>
                    <Input
                      type="date"
                      value={end_time}
                      onChange={(e) => setEnd_time(e.currentTarget.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 ">
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    checked={isActive}
                    onCheckedChange={(v) => setIsActive(Boolean(v))}
                  />
                  <span className="text-sm ">
                    {TEXT?.services?.fields?.isActive ?? "Is active"}
                  </span>
                </div>
              </div>
            </div>

            {/* Columna derecha - Schedule (3/5) */}
            <div className="lg:col-span-3 space-y-0 ">
              {/* <div className=""> */}

              <div className="flex items-center gap-3">
                {/* Select izquierdo: ocupa espacio flexible */}
                <div className="flex-1 min-w-0">
                  <label className="text-sm font-medium pb-1 block">
                    Tipo de schedule
                  </label>
                  <Select
                    value={scheduleType}
                    onValueChange={(value: "specific" | "period") =>
                      setScheduleType(value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="specific">
                        Fechas específicas
                      </SelectItem>
                      <SelectItem value="period">Período</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Checkbox: no se estira */}
                <div className="flex items-center gap-2 flex-shrink-0 pt-10">
                  <Checkbox
                    checked={recurrent}
                    onCheckedChange={(v) => {
                      setRecurrent(Boolean(v));
                      if (!v) setDateFilter("day");
                    }}
                    className="h-4 w-4" /* reduce tamaño visual si tu componente acepta className */
                  />
                  <span className="text-sm">
                    {TEXT?.services?.fields?.recurrent ?? "Recurrent"}
                  </span>
                </div>

                {/* Select derecho: ocupa el resto */}
                <div className="flex-1 min-w-0">
                  <label className="text-sm font-medium pb-1 block">
                    Vista
                  </label>
                  <Select
                    value={scheduleView}
                    onValueChange={(value: "classic" | "calendar") =>
                      setScheduleView(value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar vista" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Vista clásica</SelectItem>
                      <SelectItem value="calendar">Vista calendario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contenido condicional basado en vista y tipo */}
              <div className="space-y-3 pt-2">
                {scheduleView === "classic" ? (
                  // Vista Clásica
                  scheduleType === "specific" ? (
                    // Fechas específicas (actual)
                    <>
                      <div>
                        <label className="text-sm   ">Schedule dates</label>
                        <div className="flex gap-2 items-center ">
                          <Input
                            type="date"
                            value={scheduleInput}
                            onChange={(e) =>
                              setScheduleInput(e.currentTarget.value)
                            }
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addScheduleDate}
                            disabled={!scheduleInput}
                          >
                            {TEXT?.actions?.add ?? "Add"}
                          </Button>
                        </div>
                      </div>

                      {schedule.length > 0 && (
                        <div className="space-y-3 pt-12 ">
                          {/* Indicador de horas totales */}
                          <div className=" rounded-md p-2  border">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium ">
                               Fechas: {schedule.length}
                              </span>
                              <span className="text-sm font-bold text-primary">
                                Total de horas: {formatTotalHours()}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm text-muted-foreground  block">
                              Added dates
                            </label>
                            <ul className="space-y-1 text-xs max-h-43 overflow-y-auto border rounded-md">
                              {schedule.map((d) => (
                                <li
                                  key={d}
                                  className="flex justify-between items-center gap-2 bg-background rounded px-2 py-1"
                                >
                                  <span>{d}</span>
                                  <button
                                    type="button"
                                    className="text-sm opacity-80 hover:opacity-100"
                                    onClick={() => removeScheduleDate(d)}
                                  >
                                    ✕
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // Período
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">
                            Fecha inicio
                          </label>
                          <Input
                            type="date"
                            value={periodStart}
                            onChange={(e) =>
                              setPeriodStart(e.currentTarget.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">
                            Fecha fin
                          </label>
                          <Input
                            type="date"
                            value={periodEnd}
                            onChange={(e) =>
                              setPeriodEnd(e.currentTarget.value)
                            }
                          />
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generatePeriod}
                        disabled={!periodStart || !periodEnd}
                        className="w-full"
                      >
                        Generar y marcar fechas del período
                      </Button>

                      {schedule.length > 0 && (
                        <div>
                          <label className="text-sm text-muted-foreground mb-2 block">
                            Fechas generadas ({schedule.length})
                          </label>
                          <div className="max-h-32 overflow-y-auto bg-muted/20 rounded p-2">
                            <div className="text-xs text-muted-foreground">
                              {schedule[0]} → {schedule[schedule.length - 1]}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  // Vista Calendario
                  <div>
                    <div className="flex justify-between items-center pb-1 ">
                      <label className="text-sm text-muted-foreground">
                        Seleccionar fechas en calendario ({schedule.length}{" "}
                        seleccionadas)
                      </label>
                     {schedule.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSchedule([]);
                              setDateTimeMap({});
                              setCurrentPeriodStart(null);
                            }}
                            className=" text-xs "
                          >
                             <Paintbrush />
                          </Button>
                        )}
                    </div>
                     

                    <div className="flex gap-2 ">
                      {/* Calendario a la izquierda */}
                      <div className="flex">
                        <div className="space-y-3 ">
                          <div className="rounnded-md"><Calendar
                            mode="single"
                            selected={undefined}
                            weekStartsOn={1}
                            disabled={isDateDisabled}
                            onSelect={(clickedDate) => {
                              if (clickedDate) {
                                const clickedDateStr =
                                  convertDatesToStringArray([clickedDate])[0];

                                // En modo período, manejar selección de rangos con inicio y fin
                                if (scheduleType === "period") {
                                  if (schedule.includes(clickedDateStr)) {
                                    // Si la fecha ya está seleccionada, deseleccionarla
                                    const newDates = schedule.filter(
                                      (d) => d !== clickedDateStr
                                    );
                                    setSchedule(newDates);

                                    // Si deseleccionamos el inicio actual, limpiarlo
                                    if (clickedDateStr === currentPeriodStart) {
                                      setCurrentPeriodStart(null);
                                    }
                                  } else {
                                    if (!currentPeriodStart) {
                                      // No hay inicio definido: esta fecha se convierte en el inicio
                                      setCurrentPeriodStart(clickedDateStr);
                                      setSchedule(
                                        [...schedule, clickedDateStr].sort()
                                      );
                                    } else {
                                      // Ya hay inicio definido: esta fecha es el final del período
                                      const rangeLength = getDatesInRange(
                                        currentPeriodStart,
                                        clickedDateStr
                                      ).length;

                                      if (rangeLength <= 365) {
                                        // Límite de seguridad
                                        let rangeDates = getDatesInRange(
                                          currentPeriodStart,
                                          clickedDateStr
                                        );

                                        // Si es recurrente, aplicar patrón de repetición
                                        if (recurrent) {
                                          const currentFilter = dateFilter;

                                          if (currentFilter === "week") {
                                            // Repetir el mismo período todas las semanas
                                            rangeDates =
                                              replicateWeeklyPattern(
                                                rangeDates
                                              );
                                          } else if (
                                            currentFilter === "month"
                                          ) {
                                            // Repetir el mismo período todos los meses
                                            rangeDates =
                                              replicateMonthlyPattern(
                                                rangeDates
                                              );
                                          }
                                          // Para 'day' no hay repetición, se queda como está
                                        }

                                        // Combinar fechas existentes con el nuevo rango, sin duplicados
                                        const combinedDates = [
                                          ...new Set([
                                            ...schedule,
                                            ...rangeDates,
                                          ]),
                                        ];

                                        // Filtrar fechas para asegurar que estén dentro del período permitido
                                        let validDates = combinedDates;
                                        if (start_time && end_time) {
                                          const startDate = new Date(
                                            start_time
                                          );
                                          const endDate = new Date(end_time);

                                          validDates = combinedDates.filter(
                                            (dateStr) => {
                                              const date = new Date(dateStr);
                                              return (
                                                date >= startDate &&
                                                date <= endDate
                                              );
                                            }
                                          );
                                        }

                                        setSchedule(validDates.sort());

                                        // Limpiar el inicio para permitir definir un nuevo período
                                        setCurrentPeriodStart(null);
                                      }
                                    }
                                  }
                                  return;
                                }

                                // Para modo específico, mantener la lógica original
                                let newDates: string[] = [];

                                // Si no es recurrente, siempre usar modo día
                                const currentFilter = recurrent
                                  ? dateFilter
                                  : "day";

                                if (currentFilter === "day") {
                                  // Modo día: selección normal
                                  if (schedule.includes(clickedDateStr)) {
                                    // Si ya está seleccionada, la removemos
                                    newDates = schedule.filter(
                                      (d) => d !== clickedDateStr
                                    );
                                  } else {
                                    // Si no está seleccionada, la agregamos
                                    newDates = [...schedule, clickedDateStr];
                                  }
                                } else if (currentFilter === "week") {
                                  // Modo semana: seleccionar ese día de la semana en todas las semanas
                                  const weekdayDates =
                                    getSpecificWeekdayInRange(clickedDate);
                                  const allWeekdaySelected = weekdayDates.every(
                                    (date: string) => schedule.includes(date)
                                  );

                                  if (allWeekdaySelected) {
                                    // Si todos los días de esa semana están seleccionados, los removemos
                                    newDates = schedule.filter(
                                      (d) => !weekdayDates.includes(d)
                                    );
                                  } else {
                                    // Agregar todos los días de esa semana
                                    const uniqueDates = new Set([
                                      ...schedule,
                                      ...weekdayDates,
                                    ]);
                                    newDates = Array.from(uniqueDates);
                                  }
                                } else if (currentFilter === "month") {
                                  // Modo mes: seleccionar ese día del mes en todos los meses
                                  const monthdayDates =
                                    getSpecificMonthdayInRange(clickedDate);
                                  const allMonthdaySelected =
                                    monthdayDates.every((date: string) =>
                                      schedule.includes(date)
                                    );

                                  if (allMonthdaySelected) {
                                    // Si todos los días del mes están seleccionados, los removemos
                                    newDates = schedule.filter(
                                      (d) => !monthdayDates.includes(d)
                                    );
                                  } else {
                                    // Agregar todos los días del mes
                                    const uniqueDates = new Set([
                                      ...schedule,
                                      ...monthdayDates,
                                    ]);
                                    newDates = Array.from(uniqueDates);
                                  }
                                }

                                // Filtrar fechas para asegurar que estén dentro del período permitido
                                if (start_time && end_time) {
                                  const startDate = new Date(start_time);
                                  const endDate = new Date(end_time);

                                  newDates = newDates.filter((dateStr) => {
                                    const date = new Date(dateStr);
                                    return date >= startDate && date <= endDate;
                                  });
                                }

                                setSchedule(newDates);

                                // Inicializar horas para fechas nuevas
                                setDateTimeMap((prev) => {
                                  const newMap = { ...prev };
                                  newDates.forEach((dateStr) => {
                                    if (!newMap[dateStr]) {
                                      newMap[dateStr] = {
                                        start: calendarStartTime,
                                        end: calendarEndTime,
                                      };
                                    }
                                  });

                                  // Remover fechas que ya no están seleccionadas
                                  Object.keys(newMap).forEach((dateStr) => {
                                    if (!newDates.includes(dateStr)) {
                                      delete newMap[dateStr];
                                    }
                                  });

                                  return newMap;
                                });
                              } else {
                                setSchedule([]);
                                setDateTimeMap({});
                              }
                            }}
                            captionLayout="dropdown"
                            fromYear={2020}
                            toYear={2030}
                            formatters={{
                              formatMonthDropdown: (date) =>
                                date.toLocaleString("es", { month: "long" }),
                            }}
                            className="rounded-md border scale-[0.95] origin-top-left"
                            modifiers={{
                              selected: convertStringArrayToDates(schedule),
                              periodStart: currentPeriodStart
                                ? convertStringArrayToDates([
                                    currentPeriodStart,
                                  ])
                                : [],
                            }}
                            modifiersStyles={{
                              selected: {
                                backgroundColor: "hsl(var(--primary))",
                                color: "hsl(var(--primary-foreground))",
                                fontWeight: "bold",
                              },
                              periodStart: {
                                backgroundColor: "hsl(var(--primary))",
                                color: "hsl(var(--primary-foreground))",
                                fontWeight: "bold",
                                border: "2px solid hsl(var(--ring))",
                                borderRadius: "4px",
                              },
                            }}
                          /></div>
                          

                          {/* Filtro de fechas debajo del calendario - solo si es recurrente */}
                          {recurrent && (
                            <div className="pr-3 -mt-3">
                              <Select
                                value={dateFilter}
                                onValueChange={(
                                  value: "day" | "week" | "month"
                                ) => setDateFilter(value)}
                              >
                                <SelectTrigger className="w-full h-7 text-xs">
                                  <SelectValue placeholder="Seleccionar filtro" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="day">Día</SelectItem>
                                  <SelectItem value="week">Semana</SelectItem>
                                  <SelectItem value="month">Mes</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div >
                        
                      </div>
                        </div>
                        
                      </div>

                      

                      {/* Tabla de fechas seleccionadas a la derecha */}
                      <div className="flex-1 min-w-0">
                        <div className="space-y-1">
                          {/* Indicador de horas totales */}
                          {schedule.length > 0 && (
                            <div className="bg-muted/20 rounded-md p-2 mb-3  border ">
                              <div className="flex gap-4 items-center">
                                <span className="text-sm font-semibold">
                                  Fechas : {schedule.length}
                                </span>
                                <span className="text-sm font-semibold text-primary">
                                  Total de horas: {formatTotalHours()}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Tabla de fechas con altura fija y scroll */}
                          <div className="border rounded-md overflow-hidden h-53">
                            <div className="h-full flex flex-col">
                              <table className="w-full text-xs">
                                <thead className="bg-muted/50 sticky top-0 z-10">
                                  <tr>
                                    <th className="text-left pl-2 font-medium">
                                      Fecha
                                    </th>
                                    <th className="text-left pl-12 font-medium">
                                      Hora inicio
                                    </th>
                                    <th className="text-center pr-2  font-medium">
                                      Hora fin
                                    </th>
                                    <th className="w-8 p-2"></th>
                                  </tr>
                                </thead>
                              </table>
                              <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-xs">
                                  <tbody>
                                    {schedule.length > 0 ? (
                                      schedule.sort().map((d) => {
                                        // Evitar problemas de zona horaria al mostrar la fecha
                                        const [year, month, day] = d
                                          .split("-")
                                          .map(Number);
                                        const localDate = new Date(
                                          year,
                                          month - 1,
                                          day
                                        );
                                        const dateOutOfRange =
                                          isDateOutOfRange(d);
                                        const dateTimes = getDateTimes(d);

                                        return (
                                          <tr
                                            key={d}
                                            className={`hover:bg-accent/30 ${
                                              dateOutOfRange
                                                ? "bg-red-50 border-red-200"
                                                : ""
                                            }`}
                                          >
                                            <td
                                              className={`p-2 ${
                                                dateOutOfRange
                                                  ? "text-red-600"
                                                  : ""
                                              }`}
                                            >
                                              <div>
                                                {localDate.toLocaleDateString()}
                                              </div>
                                              {dateOutOfRange && (
                                                <div className="text-xs text-red-500">
                                                  Fuera del rango
                                                </div>
                                              )}
                                            </td>
                                            <td className="p-2">
                                              <span className="text-xs text-muted-foreground">
                                                {dateTimes.start || "--:--"}
                                              </span>
                                            </td>
                                            <td className="p-2">
                                              <span className="text-xs text-muted-foreground">
                                                {dateTimes.end || "--:--"}
                                              </span>
                                            </td>
                                            <td className="p-2 text-center">
                                              <button
                                                type="button"
                                                className="text-sm opacity-80 hover:opacity-100 text-red-500"
                                                onClick={() =>
                                                  removeScheduleDate(d)
                                                }
                                              >
                                                ✕
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    ) : (
                                      <tr>
                                        <td
                                          colSpan={4}
                                          className="p-8 text-center text-xs text-muted-foreground"
                                        >
                                          Selecciona fechas en el calendario
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>

                          {/* Campos de hora y botón aplicar en la misma fila */}
                          <div className="flex items-end gap-1">
                            <div className="w-32">
                              <label className="text-xs text-muted-foreground mb-1 block">
                                Hora inicio
                              </label>
                              <Input
                                type="time"
                                value={calendarStartTime}
                                onChange={(e) =>
                                  setCalendarStartTime(e.currentTarget.value)
                                }
                                className="h-7 text-xs"
                              />
                            </div>
                            <div className="w-32">
                              <label className="text-xs text-muted-foreground mb-1 block">
                                Hora fin
                              </label>
                              <Input
                                type="time"
                                value={calendarEndTime}
                                onChange={(e) =>
                                  setCalendarEndTime(e.currentTarget.value)
                                }
                                className="h-7 text-xs"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs flex-1 pr-2"
                              onClick={() => {
                                setDateTimeMap((prev) => {
                                  const newMap = { ...prev };
                                  schedule.forEach((date) => {
                                    newMap[date] = {
                                      start: calendarStartTime,
                                      end: calendarEndTime,
                                    };
                                  });
                                  return newMap;
                                });
                              }}
                            >
                              Aplicar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {/* </div> */}
            </div>
            {/* Resumen del Schedule */}
            {schedule.length > 0 && (
              <div className="pt-2   bg-blue-50 border border-blue-200 rounded-lg col-span-6">
                <div className="flex items-start gap-2 p-3">
                  <div className="w-4 h-4  flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      Resumen del Servicio
                    </h4>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      {generateScheduleSummary()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2 px-4 py-2">
            <Button
              variant="ghost"
              onClick={() => onClose()}
              disabled={loading}
            >
              {TEXT?.actions?.cancel ?? "Cancel"}
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              {loading
                ? TEXT?.actions?.saving ?? "Saving..."
                : TEXT?.actions?.save ?? "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
