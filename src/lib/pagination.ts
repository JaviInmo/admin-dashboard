// src/lib/pagination.ts
import { api } from '@/lib/http'

export type DrfPageResponse<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type PaginatedResult<Item> = {
  items: Item[]
  count: number
  next: string | null
  previous: string | null
}

export type ListParams = Record<string, unknown>

export function buildDrfParams(params?: ListParams): ListParams | undefined {
  if (!params) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    out[k] = v
  }
  return out
}

export async function drfList<ServerT, AppT = ServerT>(
  url: string,
  params?: ListParams,
  mapItem?: (item: ServerT) => AppT
): Promise<PaginatedResult<AppT>> {
  const { data } = await api.get<any>(url, { params: buildDrfParams(params) })

  // If backend returns a plain array (no pagination)
  if (Array.isArray(data)) {
    const items = (mapItem ? (data as ServerT[]).map(mapItem) : (data as any[])) as AppT[]
    return { items, count: items.length, next: null, previous: null }
  }

  // DRF-style
  const rawItems: ServerT[] = Array.isArray(data?.results) ? (data.results as ServerT[]) : []
  const items: AppT[] = mapItem ? rawItems.map(mapItem) : (rawItems as unknown as AppT[])
  const count: number = typeof data?.count === 'number' ? data.count : items.length
  const next: string | null = data?.next ?? null
  const previous: string | null = data?.previous ?? null

  return { items, count, next, previous }
}
