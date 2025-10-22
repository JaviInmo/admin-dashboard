// src/lib/services/common.ts
import { api } from '@/lib/http'
import { endpoints } from '@/lib/endpoints'

export type GeneralSettings = {
  app_name?: string
  app_description?: string
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  const res = await api.get(endpoints.common.generalSettings)
  return (res.data ?? {}) as GeneralSettings
}
