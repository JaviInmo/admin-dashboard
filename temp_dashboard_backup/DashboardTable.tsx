"use client"

import { useQuery } from "@tanstack/react-query"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useI18n } from "@/i18n"
import { getUpcomingShifts, DASHBOARD_KEY } from "@/lib/services/dashboard"

export function DashboardTable() {
  const { TEXT } = useI18n()
  
  const { data: upcomingShifts, isLoading } = useQuery({
    queryKey: [DASHBOARD_KEY, 'shifts'],
    queryFn: getUpcomingShifts,
    refetchInterval: 60000, // Actualizar cada minuto
  })

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-4 text-lg font-semibold">{TEXT.dashboard.upcomingShifts.title}</h3>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 text-lg font-semibold">{TEXT.dashboard.upcomingShifts.title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{TEXT.dashboard.upcomingShifts.headers.guard}</TableHead>
            <TableHead>{TEXT.dashboard.upcomingShifts.headers.location}</TableHead>
            <TableHead>{TEXT.dashboard.upcomingShifts.headers.date}</TableHead>
            <TableHead>Horario</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {upcomingShifts && upcomingShifts.length > 0 ? (
            upcomingShifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell className="font-medium">{shift.guardName}</TableCell>
                <TableCell>{shift.propertyName}</TableCell>
                <TableCell>{new Date(shift.date).toLocaleDateString('es-ES')}</TableCell>
                <TableCell>{shift.startTime} - {shift.endTime}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No hay turnos próximos programados
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
