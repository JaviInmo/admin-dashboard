// src/components/Clients/client-page.tsx
"use client"

import * as React from "react"
import ClientsTable from "./clients-table"
import ClientPropertiesTable from "./client-properties-table"
import { useI18n } from "@/i18n"
import type { AppClient } from "@/lib/services/clients"
import { listClients, getClientProperties, getClient } from "@/lib/services/clients"
import { api } from "@/lib/http"
import { endpoints } from "@/lib/endpoints"

export default function ClientPage() {
  const { TEXT } = useI18n()
  const [selectedClientId, setSelectedClientId] = React.useState<number | null>(null)

  const [clients, setClients] = React.useState<AppClient[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [page, setPage] = React.useState<number>(1)
  const [count, setCount] = React.useState<number>(0)
  const [pageSize] = React.useState<number>(10) // DRF page_size
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize))

  const [search, setSearch] = React.useState<string>("")

  const [selectedClientLabel, setSelectedClientLabel] = React.useState<string | null>(null)

  // properties for selected client
  const [properties, setProperties] = React.useState<any[]>([])
  const [propsLoading, setPropsLoading] = React.useState(false)
  const [propsError, setPropsError] = React.useState<string | null>(null)

  const fetchClients = React.useCallback(async (p = 1, q?: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await listClients(p, q, pageSize)
      setClients(res.items)
      setCount(res.count ?? 0)
      setPage(p)
    } catch (err: any) {
      const data = err?.response?.data
      if (data && typeof data !== "string") {
        setError(data.detail ?? JSON.stringify(data))
      } else {
        setError(String(data ?? TEXT.clients.errorLoading))
      }
      console.error("fetchClients error:", err)
    } finally {
      setLoading(false)
    }
  }, [pageSize, TEXT])

  // initial load
  React.useEffect(() => {
    void fetchClients(1)
  }, [fetchClients])

  const handleSearch = React.useCallback((term: string) => {
    setSearch(term)
    void fetchClients(1, term)
  }, [fetchClients])

  // fetch properties for a client id
  const fetchClientProperties = React.useCallback(async (clientId: number) => {
    setPropsLoading(true)
    setPropsError(null)
    setProperties([])
    try {
      // use helper from services if available
      try {
        const list = await getClientProperties(clientId)
        setProperties(list)
      } catch {
        const url = `${endpoints.clients}${clientId}/properties/`
        const { data } = await api.get<any>(url)
        const list = Array.isArray(data) ? data : data?.results ?? []
        setProperties(list)
      }
    } catch (err: any) {
      const data = err?.response?.data
      if (data && typeof data !== "string") {
        setPropsError(data.detail ?? JSON.stringify(data))
      } else {
        setPropsError(String(data ?? TEXT.clients.propertiesError))
      }
      console.error("fetchClientProperties error:", err)
    } finally {
      setPropsLoading(false)
    }
  }, [TEXT])

  // update selected client label & properties when selection changes
  React.useEffect(() => {
    if (selectedClientId == null) {
      setSelectedClientLabel(null)
      setProperties([])
      setPropsError(null)
      return
    }

    const found = clients.find((c) => Number(c.id) === Number(selectedClientId))
    if (found) {
      const name = (`${found.firstName ?? ""} ${found.lastName ?? ""}`.trim() || (found as any).username) ?? `#${selectedClientId}`
      setSelectedClientLabel(name)
      void fetchClientProperties(selectedClientId)
      return
    }

    let mounted = true
    const load = async () => {
      try {
        const u = await getClient(selectedClientId!)
        if (!mounted) return
        const name = (`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username) ?? `#${selectedClientId}`
        setSelectedClientLabel(name)
      } catch {
        if (mounted) setSelectedClientLabel(`#${selectedClientId}`)
      } finally {
        if (mounted) void fetchClientProperties(selectedClientId!)
      }
    }
    void load()
    return () => { mounted = false }
  }, [selectedClientId, clients, fetchClientProperties])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h2 className="text-2xl font-bold">{TEXT.clients.title}</h2>

      {error && <div className="rounded-lg border bg-card p-4 text-red-600">{error}</div>}

      <ClientsTable
        clients={clients}
        onSelectClient={(id) => setSelectedClientId(id)}
        onRefresh={() => fetchClients(page, search)}
        // server-side pagination props:
        serverSide={true}
        currentPage={page}
        totalPages={totalPages ?? 1}
        onPageChange={(p: number) => void fetchClients(p, search)}
        pageSize={pageSize}
        onSearch={handleSearch}
      />

      {loading ? (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p>{TEXT.clients.loading}</p>
        </div>
      ) : selectedClientId ? (
        <div>
          {propsError && <div className="rounded-lg border bg-card p-4 text-red-600">{propsError}</div>}
          {propsLoading ? (
            <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
              <p>{TEXT.clients.propertiesLoading}</p>
            </div>
          ) : (
            <ClientPropertiesTable
              properties={properties}
              clientName={selectedClientLabel ?? `#${selectedClientId}`}
            />
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">{TEXT.clients.selectPrompt}</p>
        </div>
      )}
    </div>
  )
}
