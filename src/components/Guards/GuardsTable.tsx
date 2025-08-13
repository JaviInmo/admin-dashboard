"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Pencil, Trash } from "lucide-react"
import { toast } from 'sonner'
import { useI18n } from "@/i18n"

interface Guard {
  id: number
  name: string
  totalHours: number
  totalSalary: number
}

interface GuardsTableProps {
  guards: Guard[]
  onSelectGuard: (guardId: number) => void
}

export default function GuardsTable({ guards, onSelectGuard }: GuardsTableProps) {
  const { TEXT } = useI18n()
  const [page, setPage] = React.useState(1)
  const itemsPerPage = 5
  const totalPages = Math.max(1, Math.ceil(guards.length / itemsPerPage))
  const startIndex = (page - 1) * itemsPerPage
  const paginatedGuards = guards.slice(startIndex, startIndex + itemsPerPage)

  React.useEffect(() => {
    // Si cambian los guards (longitud), volver a página 1
    setPage(1)
  }, [guards.length])

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(totalPages, p)))

  return (
    <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{TEXT.guards.table.title}</h3>
        <Button onClick={() => toast.info(TEXT.guards.table.add)}>{TEXT.guards.table.add}</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{TEXT.guards.table.headers.name}</TableHead>
            <TableHead className="text-center">{TEXT.guards.table.headers.totalHours}</TableHead>
            <TableHead className="text-center">{TEXT.guards.table.headers.totalSalary}</TableHead>
            <TableHead className="w-[100px] text-center">{TEXT.guards.table.headers.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedGuards.map((guard) => (
            <TableRow key={guard.id}>
              <TableCell>
                <button
                  onClick={() => onSelectGuard(guard.id)}
                  className="text-blue-600 hover:underline"
                >
                  {guard.name}
                </button>
              </TableCell>
              <TableCell className="text-center">{guard.totalHours}</TableCell>
              <TableCell className="text-center">{guard.totalSalary.toFixed(2)}</TableCell>
              <TableCell className="flex gap-2 justify-center">
                <Button size="icon" variant="ghost" onClick={() => toast.info(TEXT.guards.table.actionEdit.replace("{name}", guard.name))}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    toast.warning(
                      TEXT.guards.table.actionDeleteConfirm.replace("{name}", guard.name),
                      {
                        action: {
                          label: TEXT.guards.table.confirmLabel,
                          onClick: () => toast.success(TEXT.guards.table.deleteSuccess.replace("{name}", guard.name)),
                        },
                      }
                    )
                  }
                >
                  <Trash className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-end">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => goToPage(page - 1)} className={page === 1 ? "pointer-events-none opacity-50" : ""}/>
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => (
              <PaginationItem key={i}>
                <PaginationLink isActive={page === i + 1} onClick={() => goToPage(i + 1)}>
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext onClick={() => goToPage(page + 1)} className={page === totalPages ? "pointer-events-none opacity-50" : ""}/>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
