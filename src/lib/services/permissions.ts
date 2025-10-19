// src/lib/services/permissions.ts
import { api } from '@/lib/http'

/**
 * Construye rutas relativas para llamar al backend.
 * Ejemplo resultante: (API_BASE_URL) + /api/v1/permissions/admin/...
 */
const makeRel = (rel: string): string => `/api/${rel.replace(/^\/|\/$/g, '')}/`

/* -------------------------------------------------------------------------- */
/*  Lecturas / listados                                                        */
/* -------------------------------------------------------------------------- */

/** Lista de usuarios con sus permisos (incluye resource_permissions y property_access). */
export async function listUsersWithPermissions(): Promise<any> {
  const rel = makeRel('v1/permissions/admin/list_users_with_permissions')
  try {
    console.debug('[] GET', rel)
    const res = await api.get(rel)
    console.debug('[permissions] list_users_with_permissions', res.status, res.data)
    return res.data
  } catch (err: any) {
    console.error('[permissions] list_users_with_permissions error', err?.response?.status, err?.response?.data || err?.message)
    throw err
  }
}

/** Opciones administrables (resource_types, actions, user_roles, etc). */
export async function listAdminAvailableOptions(): Promise<any> {
  const rel = makeRel('v1/permissions/admin/available_options')
  try {
    console.debug('[permissions] GET', rel)
    const res = await api.get(rel)
    console.debug('[permissions] available_options', res.status, res.data)
    return res.data
  } catch (err: any) {
    console.warn('[permissions] available_options failed', err?.response?.status, err?.response?.data || err?.message)
    return null
  }
}

/**
 * Lista de propiedades. Intenta varios endpoints comunes (v1/properties, properties).
 * Útil para Create/Edit dialogs.
 */
export async function listProperties(params?: Record<string, unknown>): Promise<any> {
  const candidates = ['v1/properties', 'properties']
  for (const candidate of candidates) {
    const rel = makeRel(candidate)
    try {
      console.debug('[permissions] GET properties', rel, { params })
      const res = await api.get(rel, { params })
      console.debug('[permissions] properties fetched from', candidate, res.status)
      return res.data
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 404 || status === 405) {
        // intentar siguiente candidato
        continue
      }
      console.error('[permissions] properties fetch error', candidate, status, err?.response?.data || err?.message)
      throw err
    }
  }
  console.warn('[permissions] listProperties: ninguno de los candidatos respondió correctamente, devolviendo []')
  return []
}

/* -------------------------------------------------------------------------- */
/*  Grant / Revoke: resource permissions (por id y compat)                     */
/* -------------------------------------------------------------------------- */

/**
 * Otorga un permiso de recurso a un usuario.
 * Endpoint demo observado:
 * POST /api/v1/permissions/admin/grant_resource_permission/
 * Payload: { user_id, resource_type, action, reason? }
 */
export async function grantResourcePermission(userId: number, resourceType: string, action: string, reason?: string): Promise<any> {
  const rel = makeRel('v1/permissions/admin/grant_resource_permission')
  const payload = {
    user_id: userId,
    resource_type: resourceType,
    action,
    reason: reason ?? 'Otorgado desde UI'
  }
  try {
    console.debug('[permissions] POST grant_resource_permission', rel, payload)
    const res = await api.post(rel, payload)
    console.debug('[permissions] grant_resource_permission response', res.status, res.data)
    return res.data
  } catch (err: any) {
    console.error('[permissions] grant_resource_permission error', err?.response?.status, err?.response?.data || err?.message)
    throw err
  }
}

/**
 * Revoca un permiso de recurso por su permission_id (forma por id).
 * Endpoint demo observado:
 * POST /api/v1/permissions/admin/revoke_resource_permission/
 * Payload: { permission_id, reason? }
 */
export async function revokeResourcePermissionById(permissionId: number, reason?: string): Promise<any> {
  const rel = makeRel('v1/permissions/admin/revoke_resource_permission')
  const payload = {
    permission_id: permissionId,
    reason: reason ?? 'Revocado desde UI'
  }
  try {
    console.debug('[permissions] POST revoke_resource_permission (by id)', rel, payload)
    const res = await api.post(rel, payload)
    console.debug('[permissions] revoke_resource_permission (by id) response', res.status, res.data)
    return res.data
  } catch (err: any) {
    console.error('[permissions] revoke_resource_permission (by id) error', err?.response?.status, err?.response?.data || err?.message)
    throw err
  }
}

/**
 * Compatibilidad: revoca permiso pasando (userId, permissionCodename).
 * Algunos componentes antiguos llaman revokeResourcePermission(user.id, 'guard.read').
 * Esta función intenta usar la forma { user_id, permissions: [codename] }.
 * Si el backend no soporta esa forma, lanzará el error para que el caller lo maneje.
 */
export async function revokeResourcePermission(userId: number, permissionCodename: string, reason?: string): Promise<any> {
  const rel = makeRel('v1/permissions/admin/revoke_resource_permission')
  const payload = {
    user_id: userId,
    permissions: [permissionCodename],
    reason: reason ?? 'Revocado desde UI (compat)'
  }
  try {
    console.debug('[permissions] POST revoke_resource_permission (compat user+codename)', rel, payload)
    const res = await api.post(rel, payload)
    console.debug('[permissions] revoke_resource_permission (compat) response', res.status, res.data)
    return res.data
  } catch (err: any) {
    console.warn('[permissions] revoke_resource_permission (compat) failed', err?.response?.status, err?.response?.data || err?.message)
    throw err
  }
}

/* -------------------------------------------------------------------------- */
/*  Grant / Revoke: property access (por id y compat)                         */
/* -------------------------------------------------------------------------- */

/**
 * Otorga acceso a propiedad.
 * Observado endpoint:
 * POST /api/v1/permissions/admin/grant_property_access/
 * Payload demo: { user_id, property_id, access_type, permissions: {...}, reason }
 */
export async function grantPropertyAccess(userId: number, propertyId: number, accessType: string = 'viewer', permissionsObj?: Record<string, unknown>, reason?: string): Promise<any> {
  const rel = makeRel('v1/permissions/admin/grant_property_access')
  const payload = {
    user_id: userId,
    property_id: propertyId,
    access_type: accessType,
    permissions: permissionsObj ?? {
      can_create_shifts: false,
      can_edit_shifts: false,
      can_create_expenses: false,
      can_edit_expenses: false,
      can_approve_expenses: accessType === 'admin' || accessType === 'full'
    },
    reason: reason ?? 'Otorgado desde UI'
  }
  try {
    console.debug('[permissions] POST grant_property_access', rel, payload)
    const res = await api.post(rel, payload)
    console.debug('[permissions] grant_property_access response', res.status, res.data)
    return res.data
  } catch (err: any) {
    console.error('[permissions] grant_property_access error', err?.response?.status, err?.response?.data || err?.message)
    throw err
  }
}

/**
 * Revoca acceso a propiedad por access_id (forma por id).
 * Endpoint observado:
 * POST /api/v1/permissions/admin/revoke_property_access/
 * Payload: { access_id, reason? }
 */
export async function revokePropertyAccessById(accessId: number, reason?: string): Promise<any> {
  const rel = makeRel('v1/permissions/admin/revoke_property_access')
  const payload = {
    access_id: accessId,
    reason: reason ?? 'Revocado desde UI'
  }
  try {
    console.debug('[permissions] POST revoke_property_access (by id)', rel, payload)
    const res = await api.post(rel, payload)
    console.debug('[permissions] revoke_property_access (by id) response', res.status, res.data)
    return res.data
  } catch (err: any) {
    console.error('[permissions] revoke_property_access (by id) error', err?.response?.status, err?.response?.data || err?.message)
    throw err
  }
}

/**
 * Compatibilidad: revokePropertyAccess(userId, propertyId).
 * Algunos componentes llaman revokePropertyAccess(user.id, pid).
 * Intentamos llamar al endpoint con { user_id, property_id } si el backend lo acepta.
 */
export async function revokePropertyAccess(userId: number, propertyId: number, reason?: string): Promise<any> {
  const rel = makeRel('v1/permissions/admin/revoke_property_access')
  const payload = {
    user_id: userId,
    property_id: propertyId,
    reason: reason ?? 'Revocado desde UI (compat)'
  }
  try {
    console.debug('[permissions] POST revoke_property_access (compat user+property)', rel, payload)
    const res = await api.post(rel, payload)
    console.debug('[permissions] revoke_property_access (compat) response', res.status, res.data)
    return res.data
  } catch (err: any) {
    console.warn('[permissions] revoke_property_access (compat) failed', err?.response?.status, err?.response?.data || err?.message)
    throw err
  }
}

/* -------------------------------------------------------------------------- */
/*  Helper: assignUserPermissions (compat para codenames)                     */
/* -------------------------------------------------------------------------- */

/**
 * assignUserPermissions: helper de compatibilidad que acepta codenames
 * (ej. ['guard.read','client.create']) y llama a grantResourcePermission
 * por cada codename. Devuelve array de resultados o lanza error con detalles.
 */
export async function assignUserPermissions(userId: number, permissionCodenames: string[]): Promise<any> {
  if (!permissionCodenames || permissionCodenames.length === 0) return null

  const results: Array<{ codename: string; ok: boolean; res?: any; err?: any }> = []

  for (const codename of permissionCodenames) {
    const clean = String(codename || '').trim()
    const sep = clean.includes('.') ? '.' : (clean.includes('_') ? '_' : (clean.includes(':') ? ':' : null))
    if (!sep) {
      console.warn('[permissions] assignUserPermissions: codename no estándar, se omite', codename)
      results.push({ codename, ok: false, err: new Error('codename no estándar') })
      continue
    }
    const [rPart, aPart] = clean.split(sep)
    const resource = String(rPart).toLowerCase()
    let action = String(aPart).toLowerCase()

    // Mapeo común: edit -> update
    if (action === 'edit') action = 'update'

    try {
      const res = await grantResourcePermission(userId, resource, action, 'Otorgado desde assignUserPermissions')
      results.push({ codename, ok: true, res })
    } catch (err: any) {
      // detectar caso backend que solo acepta roles
      const body = err?.response?.data
      const status = err?.response?.status
      const bodyMsg = typeof body === 'object' ? JSON.stringify(body) : String(body)
      if (status === 400 && bodyMsg.includes('user_id') && bodyMsg.includes('role')) {
        const e: any = new Error('BACKEND_ROLE_ONLY: el backend requiere user_id + role (assignment por role en vez de resource/action)')
        e.code = 'BACKEND_ROLE_ONLY'
        e.info = { backendResponse: body, attempted: codename }
        throw e
      }
      results.push({ codename, ok: false, err })
      // seguimos para recolectar fallos
    }
  }

  const failed = results.filter(r => !r.ok)
  if (failed.length > 0) {
    const err = new Error(`assignUserPermissions: ${failed.length}/${results.length} fallidos`)
    ;(err as any).details = results
    throw err
  }

  return results.map(r => r.res)
}
