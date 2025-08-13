// src/lib/permissions-utils.ts
// Funciones para convertir la respuesta del backend a un shape usable por la UI.

type UiPermissions = Record<string, Record<string, boolean>>
type AvailableActions = Record<string, string[]> // section -> list of actions e.g. ['create','read','edit','delete']

/**
 * Map verbs comunes del backend a las acciones de la UI
 */
function verbToAction(verb: string) {
  const v = verb.toLowerCase()
  if (/(add|create)/.test(v)) return 'create'
  if (/(change|edit|update)/.test(v)) return 'edit'
  if (/(view|read|get)/.test(v)) return 'read'
  if (/(delete|remove)/.test(v)) return 'delete'
  return verb // fallback
}

/**
 * Normaliza distintas formas de respuesta del servidor a:
 * - availableActions: { section: ['create','read', ...] }
 * - initialPermissions: { section: { create: false, ... } }
 *
 * Acepta:
 * - array de strings: "cliente.create", "guardia.read"
 * - array de objetos: { codename: "cliente.create", name: "...", section: "cliente" }
 * - objeto ya anidado: { cliente: { create: true, read: false } }
 */
export function normalizePermissionsFromServer(resp: any): { availableActions: AvailableActions; initialPermissions: UiPermissions } {
  const availableActions: AvailableActions = {}
  const initialPermissions: UiPermissions = {}

  if (!resp) return { availableActions, initialPermissions }

  // Caso: objeto anidado ya { cliente: { create: true, ... }, ... }
  if (typeof resp === 'object' && !Array.isArray(resp) && Object.values(resp).every(v => typeof v === 'object')) {
    for (const [section, actions] of Object.entries(resp)) {
      availableActions[section] = Object.keys(actions as Record<string, any>)
      initialPermissions[section] = {}
      for (const a of availableActions[section]) initialPermissions[section][a] = Boolean((actions as Record<string, any>)[a])
    }
    return { availableActions, initialPermissions }
  }

  // Si es array: normalizar cada entry
  const arr = Array.isArray(resp) ? resp : [resp]
  for (const entry of arr) {
    if (!entry) continue

    // entry string -> "cliente.create" o "cliente.create_some"
    if (typeof entry === 'string') {
      const parts = entry.split('.')
      if (parts.length >= 2) {
        const section = parts[0]
        const verb = parts.slice(1).join('.') // por si hay puntos extra
        const action = verbToAction(verb)
        availableActions[section] = availableActions[section] ?? []
        if (!availableActions[section].includes(action)) availableActions[section].push(action)
      }
      continue
    }

    // entry object con codename / section
    if (typeof entry === 'object') {
      const codename = (entry.codename as string) ?? (entry.name as string) ?? ''
      let section = entry.section as string | undefined
      if (!section && typeof codename === 'string' && codename.includes('.')) {
        section = codename.split('.')[0]
      }
      if (section) {
        const verb = (entry.codename as string)?.split('.').slice(1).join('.') ?? ''
        const action = verb ? verbToAction(verb) : (entry.name ? verbToAction(String(entry.name)) : 'read')
        availableActions[section] = availableActions[section] ?? []
        if (!availableActions[section].includes(action)) availableActions[section].push(action)
      }
      continue
    }
  }

  // inicializa initialPermissions con false para todas las acciones detectadas
  for (const [section, actions] of Object.entries(availableActions)) {
    initialPermissions[section] = {}
    for (const a of actions) initialPermissions[section][a] = false
  }

  return { availableActions, initialPermissions }
}

/** Convierte el objeto de permisos de UI a un array de codenames para enviar al backend. */
export function uiPermissionsToCodenames(ui: UiPermissions) {
  const codenames: string[] = []
  for (const [section, actions] of Object.entries(ui)) {
    for (const [action, enabled] of Object.entries(actions)) {
      if (!enabled) continue
      // Forma por defecto: `${section}.${action}`
      codenames.push(`${section}.${action}`)
    }
  }
  return codenames
}
