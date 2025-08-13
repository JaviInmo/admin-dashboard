// src/components/Clients/client-page.tsx
"use client"

import * as React from "react"
import ClientsTable from "./clients-table"
import ClientPropertiesTable from "./client-properties-table"
import { UI_TEXT } from "@/config/ui-text"
import type { AppClient } from "@/lib/services/clients"
import { listClients, getClientProperties, getClient } from "@/lib/services/clients"
import { api } from "@/lib/http"
import { endpoints } from "@/lib/endpoints"

export default function ClientPage() {
  const [selectedClientId, setSelectedClientId] = React.useState<number | null>(null)

  const [clients, setClients] = React.useState<AppClient[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [page, setPage] = React.useState<number>(1)
  const [count, setCount] = React.useState<number | undefined>(undefined)
  const [pageSize, setPageSize] = React.useState<number>(5) // fallback; updated based on results
  const totalPages = count ? Math.max(1, Math.ceil(count / pageSize)) : 1

  const [search, setSearch] = React.useState<string>("")
  // use browser-friendly timeout type
  const searchRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedClientLabel, setSelectedClientLabel] = React.useState<string | null>(null)

  // properties for selected client
  const [properties, setProperties] = React.useState<any[]>([])
  const [propsLoading, setPropsLoading] = React.useState(false)
  const [propsError, setPropsError] = React.useState<string | null>(null)

  const fetchClients = React.useCallback(async (p = 1, q?: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await listClients(p, q)
      setClients(res.items)
      setCount(res.count)
      // infer pageSize from returned items length when possible
      const inferredPageSize = res.items.length > 0 ? res.items.length : pageSize
      setPageSize(inferredPageSize)
      setPage(p)
    } catch (err: any) {
      const data = err?.response?.data
      if (data && typeof data !== "string") {
        setError(data.detail ?? JSON.stringify(data))
      } else {
        setError(String(data ?? "Error loading clients"))
      }
      console.error("fetchClients error:", err)
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  // debounce search: call fetchClients 400ms after last keystroke
  React.useEffect(() => {
    if (searchRef.current) {
      window.clearTimeout(searchRef.current)
      searchRef.current = null
    }
    searchRef.current = window.setTimeout(() => {
      void fetchClients(1, search)
    }, 400)
    return () => {
      if (searchRef.current) {
        window.clearTimeout(searchRef.current)
        searchRef.current = null
      }
    }
  }, [search, fetchClients])

  // initial load
  React.useEffect(() => {
    void fetchClients(1)
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
        setPropsError(String(data ?? "Error loading properties"))
      }
      console.error("fetchClientProperties error:", err)
    } finally {
      setPropsLoading(false)
    }
  }, [])

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
      <h2 className="text-2xl font-bold">{UI_TEXT?.clients?.title ?? "Clients"}</h2>

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
      />

      {loading ? (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <p>Loading clients...</p>
        </div>
      ) : selectedClientId ? (
        <div>
          {propsError && <div className="rounded-lg border bg-card p-4 text-red-600">{propsError}</div>}
          {propsLoading ? (
            <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
              <p>Loading properties...</p>
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
          <p className="text-sm text-muted-foreground">Select a client to view its properties.</p>
        </div>
      )}
    </div>
  )
}
