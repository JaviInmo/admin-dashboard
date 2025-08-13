// src/lib/services/permissions.ts
import { api } from '@/lib/http'

/** Helper: ruta relativa con slash final */
const makeRel = (rel: string) => `/api/${rel.replace(/^\/|\/$/g, '')}/`

/**
 * Obtain the admin available options (resource types, actions, roles, etc.)
 * Endpoint (swagger): /v1/permissions/admin/available_options/
 */
export async function listAdminAvailableOptions(): Promise<any> {
  const rel = makeRel('v1/permissions/admin/available_options')
  try {
    const res = await api.get(rel)
    console.debug('[permissions] available_options', res.status, res.data)
    return res.data
  } catch (err: any) {
    console.warn('[permissions] available_options failed', err?.response?.status, err?.response?.data || err?.message)
    return null
  }
}

/**
 * Get properties list for grant/revoke property access UI.
 * Tries v1/properties first (some installs) and falls back to /properties/ if 404.
 */
export async function listProperties(params?: Record<string, any>): Promise<any> {
  const candidates = ['v1/properties', 'properties']
  for (const c of candidates) {
    const rel = makeRel(c)
    try {
      const res = await api.get(rel, { params })
      console.debug('[permissions] properties fetched from', c, res.status)
      return res.data
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 404 || status === 405) {
        // try next candidate
        continue
      }
      console.error('[permissions] properties fetch error', c, status, err?.response?.data || err?.message)
      return []
    }
  }
  console.warn('[permissions] listProperties: no candidate path worked, returning []')
  return []
}

/**
 * Assign multiple resource permissions to a user.
 * Shape used: { user: <id>, permissions: [ 'guard.read', 'expense.create', ... ] }
 * Endpoint (swagger): /v1/permissions/admin/assign_user_role/
 */
export async function assignUserPermissions(userId: number, permissionCodenames: string[]) {
  if (!permissionCodenames || permissionCodenames.length === 0) return null
  const rel = makeRel('v1/permissions/admin/assign_user_role')
  const payload = { user: userId, permissions: permissionCodenames }
  try {
    const res = await api.post(rel, payload)
    console.debug('[permissions] assign_user_role', res.status, res.data)
    return res.data
  } catch (err: any) {
    console.error('[permissions] assign_user_role error', err?.response?.status, err?.response?.data || err?.message)
    throw err
  }
}

/**
 * Grant property access for a single property to a user.
 * Shape assumed: { user: <id>, property: <propertyId> }
 * Endpoint (swagger): /v1/permissions/admin/grant_property_access/
 */
export async function grantPropertyAccess(userId: number, propertyId: number) {
  const rel = makeRel('v1/permissions/admin/grant_property_access')
  const payload = { user: userId, property: propertyId }
  try {
    const res = await api.post(rel, payload)
    console.debug('[permissions] grant_property_access', res.status, res.data)
    return res.data
  } catch (err: any) {
    console.error('[permissions] grant_property_access error', err?.response?.status, err?.response?.data || err?.message)
    return null
  }
}

/**
 * Revoke property access for a single property from a user.
 * Shape assumed: { user: <id>, property: <propertyId> }
 * Endpoint (swagger): /v1/permissions/admin/revoke_property_access/
 */
export async function revokePropertyAccess(userId: number, propertyId: number) {
  const rel = makeRel('v1/permissions/admin/revoke_property_access')
  const payload = { user: userId, property: propertyId }
  try {
    const res = await api.post(rel, payload)
    console.debug('[permissions] revoke_property_access', res.status, res.data)
    return res.data
  } catch (err: any) {
    console.error('[permissions] revoke_property_access error', err?.response?.status, err?.response?.data || err?.message)
    return null
  }
}

/**
 * Revoke a resource permission (single codename) from a user.
 * Shape assumed: { user: <id>, permissions: [ 'guard.read' ] }
 * Endpoint (swagger): /v1/permissions/admin/revoke_resource_permission/
 */
export async function revokeResourcePermission(userId: number, permissionCodename: string) {
  const rel = makeRel('v1/permissions/admin/revoke_resource_permission')
  const payload = { user: userId, permissions: [permissionCodename] }
  try {
    const res = await api.post(rel, payload)
    console.debug('[permissions] revoke_resource_permission', res.status, res.data)
    return res.data
  } catch (err: any) {
    console.error('[permissions] revoke_resource_permission error', err?.response?.status, err?.response?.data || err?.message)
    throw err
  }
}
