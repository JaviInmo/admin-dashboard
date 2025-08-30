"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { useI18n } from "@/i18n"

import CreateShift from "@/components/Shifts/Create/Create"
import ShowShift from "@/components/Shifts/Show/Show"
import EditShift from "@/components/Shifts/Edit/Edit"
import DeleteShift from "@/components/Shifts/Delete/Delete"
import type { Shift } from "@/components/Shifts/types"
import { listShiftsByGuard } from "@/lib/services/shifts"
import { RefreshCw } from "lucide-react"


/**
 * Normaliza la respuesta del backend a la forma `Shift` que espera la UI.
 */
function normalizeShiftsArray(input: any): Shift[] {
  if (!input) return []
  const arr = Array.isArray(input)
    ? input
    : Array.isArray(input?.results)
      ? input.results
      : Array.isArray(input?.items)
        ? input.items
        : null
  if (!arr) return []
  return arr.map((s: any) => {
    const guardId =
      s.guard ??
      s.guard_id ??
      (s.guard_details ? (s.guard_details.id ?? s.guard_details.pk ?? undefined) : undefined) ??
      (s.guard && typeof s.guard === "object" ? s.guard.id : undefined)

    const propertyId =
      s.property ??
      s.property_id ??
      (s.property_details ? (s.property_details.id ?? s.property_details.pk ?? undefined) : undefined) ??
      (s.property && typeof s.property === "object" ? s.property.id : undefined)

    return {
      id: s.id ?? s.pk ?? 0,
      guard: guardId,
      property: propertyId,
      startTime: s.start_time ?? s.startTime ?? s.start ?? null,
      endTime: s.end_time ?? s.endTime ?? s.end ?? null,
      status: s.status ?? "scheduled",
      hoursWorked: s.hours_worked ?? s.hoursWorked ?? s.hours ?? 0,
      isActive: s.is_active ?? s.isActive ?? true,
      __raw: s,
    } as Shift
  })
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/* function formatDateForInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  return `${year}-${month}-${day}T09:00` // Default to 9 AM
} */

type Props = {
  guardId: number
  guardName?: string
  open: boolean
  onClose: () => void
}

export default function GuardsShiftsModal({ guardId, guardName, open, onClose }: Props) {
  const { TEXT } = useI18n()

  const [shifts, setShifts] = React.useState<Shift[]>([])
  const [page, setPage] = React.useState<number>(1)
  const [loading, setLoading] = React.useState<boolean>(false)
  const [hasNext, setHasNext] = React.useState<boolean>(false)

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined)
  const [daysWithShifts, setDaysWithShifts] = React.useState<Date[]>([])

  const filteredShifts = React.useMemo(() => {
    if (!selectedDate) return shifts // Show all shifts when no date selected
    return shifts.filter((shift) => {
      if (!shift.startTime) return false
      const shiftDate = new Date(shift.startTime)
      return isSameDay(shiftDate, selectedDate)
    })
  }, [shifts, selectedDate])

  React.useEffect(() => {
    if (!open) return
    let mounted = true

    async function fetchFirst() {
      setLoading(true)
      try {
        const res = await listShiftsByGuard(guardId, 1, 50, "-start_time") // Increased limit to get more shifts for calendar
        const normalized = normalizeShiftsArray(res)
        if (!mounted) return
        setShifts(normalized)
        setPage(1)
        setHasNext(Boolean(res?.next ?? res?.previous ?? res?.items ?? false))

        const daysWithShiftsSet = new Set<string>()
        normalized.forEach((shift) => {
          if (shift.startTime) {
            const date = new Date(shift.startTime)
            daysWithShiftsSet.add(date.toDateString())
          }
        })
        setDaysWithShifts(Array.from(daysWithShiftsSet).map((dateStr) => new Date(dateStr)))
      } catch (err) {
        console.error("[ShiftsModal] error fetching:", err)
        toast.error(TEXT?.shifts?.errors?.fetchFailed ?? "Could not load shifts")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchFirst()

    return () => {
      mounted = false
    }
  }, [open, guardId])

  async function loadMore() {
    const nextPage = page + 1
    setLoading(true)
    try {
      const res = await listShiftsByGuard(guardId, nextPage, 50, "-start_time") // Increased limit
      const newItems = normalizeShiftsArray(res)
      setShifts((p) => [...p, ...newItems])
      setPage(nextPage)
      setHasNext(Boolean(res?.next ?? res?.previous ?? res?.items ?? false))

      const daysWithShiftsSet = new Set(daysWithShifts.map((d) => d.toDateString()))
      newItems.forEach((shift) => {
        if (shift.startTime) {
          const date = new Date(shift.startTime)
          daysWithShiftsSet.add(date.toDateString())
        }
      })
      setDaysWithShifts(Array.from(daysWithShiftsSet).map((dateStr) => new Date(dateStr)))
    } catch (err) {
      console.error("[LoadMore] error:", err)
      toast.error(TEXT?.shifts?.errors?.fetchFailed ?? "Could not load shifts")
    } finally {
      setLoading(false)
    }
  }

  function handleCreated(s: Shift) {
    setShifts((p) => [s, ...p])
    setOpenCreate(false)

    if (s.startTime) {
      const newDate = new Date(s.startTime)
      const dateExists = daysWithShifts.some((d) => isSameDay(d, newDate))
      if (!dateExists) {
        setDaysWithShifts((prev) => [...prev, newDate])
      }
    }

    toast.success(TEXT?.shifts?.messages?.created ?? "Shift created")
  }

  function handleUpdated(s: Shift) {
    setShifts((p) => p.map((x) => (x.id === s.id ? s : x)))
    setOpenShowId(null)
    setOpenEditId(null)
    setOpenDeleteId(null)

    const daysWithShiftsSet = new Set<string>()
    shifts
      .map((shift) => (shift.id === s.id ? s : shift))
      .forEach((shift) => {
        if (shift.startTime) {
          const date = new Date(shift.startTime)
          daysWithShiftsSet.add(date.toDateString())
        }
      })
    setDaysWithShifts(Array.from(daysWithShiftsSet).map((dateStr) => new Date(dateStr)))

    toast.success(TEXT?.shifts?.messages?.updated ?? "Shift updated")
  }

  function handleDeleted(id: number) {
    setShifts((p) => p.filter((x) => x.id !== id))
    setOpenShowId(null)
    setOpenEditId(null)
    setOpenDeleteId(null)

    const remainingShifts = shifts.filter((x) => x.id !== id)
    const daysWithShiftsSet = new Set<string>()
    remainingShifts.forEach((shift) => {
      if (shift.startTime) {
        const date = new Date(shift.startTime)
        daysWithShiftsSet.add(date.toDateString())
      }
    })
    setDaysWithShifts(Array.from(daysWithShiftsSet).map((dateStr) => new Date(dateStr)))

    toast.success(TEXT?.shifts?.messages?.deleted ?? "Shift deleted")
  }

  const [openCreate, setOpenCreate] = React.useState(false)
  const [openShowId, setOpenShowId] = React.useState<number | null>(null)
  const [openEditId, setOpenEditId] = React.useState<number | null>(null)
  const [openDeleteId, setOpenDeleteId] = React.useState<number | null>(null)

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) onClose()
      }}
    >
      <DialogContent size="xl"  className=" max-h-[90vh]">
        {" "}
        {/* Increased width for two-column layout */}
        <DialogHeader>
          <div className="flex items-center justify-between w-full pt-4">
            <div>
              <DialogTitle className="text-lg px-2">
                {guardName
                  ? `${TEXT?.shifts?.show?.title ?? "Turnos"} | ${guardName}`
                  : (TEXT?.shifts?.show?.title ?? "Turnos")}
              </DialogTitle>
              <div className="text-xs text-muted-foreground px-2">
                {selectedDate ? `Turnos para ${selectedDate.toLocaleDateString()}` : "Todos los turnos del guardia"}
              </div>
            </div>
            <div className="flex items-center gap-2 pr-1">
              <Button size="sm" onClick={() => setOpenCreate(true)} disabled={!selectedDate}>
                <Plus className="h-4 w-4 mr-1" />
                {TEXT?.shifts?.create?.title ?? TEXT?.actions?.create ?? "Crear"}
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex gap-6 h-[60vh]">
          {/* Left column: Calendar */}
          <div className="w-80 flex-shrink-0">
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendario
              </h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  hasShifts: daysWithShifts,
                }}
                modifiersStyles={{
                  hasShifts: {
                    backgroundColor: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                    fontWeight: "bold",
                  },
                }}
                className="rounded-md border-0"
              />
              <div className="mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary"></div>
                  <span>Días con turnos</span>
                </div>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(undefined)}
                    className="mt-2 h-6 px-2 text-xs"
                  >
                    Ver todos los turnos
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right column: Shifts list */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-auto space-y-3">
              {loading && shifts.length === 0 ? (
                <div className="text-sm text-muted-foreground">{TEXT?.common?.loading ?? "Loading..."}</div>
              ) : filteredShifts.length === 0 ? (
                <div className="rounded border border-dashed border-muted/50 p-4 text-sm text-muted-foreground text-center">
                  {selectedDate
                    ? `No hay turnos para ${selectedDate.toLocaleDateString()}`
                    : "No hay turnos para este guardia"}
                </div>
              ) : (
                filteredShifts.map((s) => {
                  const raw = (s as any).__raw
                  const propertyLabel = raw?.property_details?.name ?? raw?.property_details?.alias ?? s.property
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-4 rounded-md border p-3 shadow-sm bg-card"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 text-muted-foreground">
                          <CalendarIcon className="h-5 w-5" />
                        </div>
                        <div>
                          {!selectedDate && s.startTime && (
                            <div className="text-xs text-muted-foreground mb-1">
                              {new Date(s.startTime).toLocaleDateString()}
                            </div>
                          )}
                          <div className="text-sm font-medium">
                            {s.startTime
                              ? new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : "—"}{" "}
                            —{" "}
                            {s.endTime
                              ? new Date(s.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {s.status} · {s.hoursWorked}h · {propertyLabel}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setOpenShowId(s.id)}
                          title={TEXT?.actions?.view ?? "Ver"}
                        >
                          {TEXT?.actions?.view ?? "Ver"}
                        </Button>

                        <Button size="sm" variant="outline" onClick={() => setOpenEditId(s.id)}>
                          {TEXT?.actions?.edit ?? "Editar"}
                        </Button>

                        <Button size="sm" variant="destructive" onClick={() => setOpenDeleteId(s.id)}>
                          {TEXT?.actions?.delete ?? "Eliminar"}
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="flex items-center w-full gap-2">
            {hasNext ? (
              <>
                <div className="flex-1">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm
                               disabled:opacity-70 disabled:cursor-not-allowed
                               focus:outline-none focus:ring-2 focus:ring-offset-0 text-white bg-black"
                    aria-label={
                      loading ? (TEXT?.common?.loading ?? "Loading...") : (TEXT?.actions?.refresh ?? "Cargar más")
                    }
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>
                      {loading ? (TEXT?.common?.loading ?? "Loading...") : (TEXT?.actions?.refresh ?? "Cargar más")}
                    </span>
                  </Button>
                </div>
                <div>
                  <Button variant="outline" onClick={onClose} className="text-sm px-3 py-2 bg-transparent">
                    {TEXT?.actions?.close ?? "Close"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="ml-auto">
                <Button variant="outline" onClick={onClose} className="text-sm px-3 py-2 bg-transparent">
                  {TEXT?.actions?.close ?? "Close"}
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      <CreateShift
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        guardId={guardId}
        selectedDate={selectedDate} // Pass selected date to create component
        onCreated={handleCreated}
      />

      {openShowId !== null && (
        <ShowShift
          open={openShowId !== null}
          onClose={() => setOpenShowId(null)}
          shiftId={openShowId as number}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      {openEditId !== null && (
        <EditShift
          open={openEditId !== null}
          onClose={() => setOpenEditId(null)}
          shiftId={openEditId as number}
          onUpdated={handleUpdated}
        />
      )}

      {openDeleteId !== null && (
        <DeleteShift
          open={openDeleteId !== null}
          onClose={() => setOpenDeleteId(null)}
          shiftId={openDeleteId as number}
          onDeleted={handleDeleted}
        />
      )}
    </Dialog>
  )
}
