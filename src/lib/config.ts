// src/lib/config.ts
// Central config for client-side values.
// Re-export constants for projects that still import from './config'.

export { API_BASE_URL, WITH_CREDENTIALS } from './constants'

export const IS_DEV = import.meta.env.DEV
