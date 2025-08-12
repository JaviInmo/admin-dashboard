// src/components/Users/types.ts

/**
 * Tipo usado en la UI. El backend devuelve campos como `username`, `email`,
 * `first_name`, `last_name`. En el service los mapeamos a `firstName`/`lastName`.
 *
 * Campos opcionales cuando el backend no los devuelva en la lista.
 */
export interface User {
  id: number
  username: string
  firstName?: string
  lastName?: string
  // Para compatibilidad con código antiguo que esperaba `name` (first + last o username)
  name?: string
  email: string

  // Campos opcionales devueltos por el backend (DRF)
  isActive?: boolean
  isStaff?: boolean
  isSuperuser?: boolean
  dateJoined?: string
  lastLogin?: string | null

  permissions?: Permissions
}

export type PermissionAction = "create" | "edit" | "read" | "delete"

export type AppSection = "cliente" | "guardia" | "ubicacion" | "dashboard"

/**
 * Permissions estructura:
 * {
 *   cliente: { create: boolean, edit: boolean, read: boolean, delete: boolean },
 *   guardia: { ... },
 *   ...
 * }
 */
export type Permissions = Record<AppSection, Record<PermissionAction, boolean>>
