"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useI18n } from "@/i18n"
import { DASHBOARD_CONFIG } from "@/config/ui-dashboard"

export function DashboardTable() {
  const { TEXT } = useI18n()
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 text-lg font-semibold">{TEXT.dashboard.upcomingShifts.title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{TEXT.dashboard.upcomingShifts.headers.guard}</TableHead>
            <TableHead>{TEXT.dashboard.upcomingShifts.headers.location}</TableHead>
            <TableHead>{TEXT.dashboard.upcomingShifts.headers.date}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {DASHBOARD_CONFIG.upcomingShifts.map((shift, i) => (
            <TableRow key={i}>
              <TableCell>{shift.guard}</TableCell>
              <TableCell>{shift.location}</TableCell>
              <TableCell>{shift.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
