// src/components/Users/types.ts

export interface User {
  id: number
  name: string
  email: string
  permissions: Permissions
}

export type PermissionAction = "create" | "edit" | "read" | "delete"

export type AppSection = "cliente" | "guardia" | "ubicacion" | "dashboard"

export type Permissions = Record<AppSection, Record<PermissionAction, boolean>>
