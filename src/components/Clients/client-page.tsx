"use client"

import * as React from "react"
import ClientsTable from "./clients-table"
import ClientPropertiesTable from "./client-properties-table"
import { UI_TEXT } from "@/config/ui-text"
import type { AppClient } from "@/lib/services/clients"
import { listClients, getClient } from "@/lib/services/clients"
import { api } from "@/lib/http"
import { endpoints } from "@/lib/endpoints"

export default function ClientPage() {
  const [selectedClientId, setSelectedClientId] = React.useState<number | null>(null)

  const [clients, setClients] = React.useState<AppClient[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [selectedClientLabel, setSelectedClientLabel] = React.useState<string | null>(null)

  // properties for selected client
  const [properties, setProperties] = React.useState<any[]>([])
  const [propsLoading, setPropsLoading] = React.useState(false)
  const [propsError, setPropsError] = React.useState<string | null>(null)

  // fetch clients from API
  const fetchClients = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listClients()
      setClients(data)
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
  }, [])

  // fetch properties for a client id
  const fetchClientProperties = React.useCallback(async (clientId: number) => {
    setPropsLoading(true)
    setPropsError(null)
    setProperties([])
    try {
      // Calls GET /clients/{id}/properties/
      const url = `${endpoints.clients}${clientId}/properties/`
      const { data } = await api.get<any>(url)
      // swagger returns list (or {results: []}) — normalize to array
      const list = Array.isArray(data) ? data : data?.results ?? []
      setProperties(list)
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

  // load clients on mount
  React.useEffect(() => {
    void fetchClients()
  }, [fetchClients])

  // update selected client label when selection changes or clients list changes
  React.useEffect(() => {
    if (selectedClientId == null) {
      setSelectedClientLabel(null)
      setProperties([])
      setPropsError(null)
      return
    }

    // try find in already-loaded clients
    const found = clients.find((c) => Number(c.id) === Number(selectedClientId))
    if (found) {
      const name = ( `${found.firstName ?? ""} ${found.lastName ?? ""}`.trim() || (found as any).username ) ?? `#${selectedClientId}`
      setSelectedClientLabel(name)
      // fetch properties for this client
      void fetchClientProperties(selectedClientId)
      return
    }

    // if not found locally, request getClient
    let mounted = true
    const load = async () => {
      try {
        const u = await getClient(selectedClientId!)
        if (!mounted) return
        const name = ( `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.username ) ?? `#${selectedClientId}`
        setSelectedClientLabel(name)
      } catch (err) {
        if (mounted) setSelectedClientLabel(`#${selectedClientId}`)
      } finally {
        // still try to fetch properties even if name failed
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
        onRefresh={fetchClients}
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
