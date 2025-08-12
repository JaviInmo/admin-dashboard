"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UI_TEXT } from "@/config/ui-text"
import { DASHBOARD_CONFIG } from "@/config/ui-dashboard"

export function DashboardTable() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 text-lg font-semibold">{UI_TEXT.dashboard.upcomingShifts.title}</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{UI_TEXT.dashboard.upcomingShifts.headers.guard}</TableHead>
            <TableHead>{UI_TEXT.dashboard.upcomingShifts.headers.location}</TableHead>
            <TableHead>{UI_TEXT.dashboard.upcomingShifts.headers.date}</TableHead>
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
