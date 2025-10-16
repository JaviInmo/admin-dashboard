// src/lib/constants.ts
// Centralized constants for a frontend-only project.
// Update API_BASE_URL as needed per environment.

// Root without locale; locale will be appended dynamically (e.g., /en/ or /es/)
export const API_BASE_ROOT = import.meta.env.VITE_API_BASE_URL
//  'https://wr60a2rc2j.execute-api.us-east-2.amazonaws.com/dev/' as const
export const DEFAULT_LANG = 'en' as const
// Backwards-compat: a default-constructed base URL that includes the default locale
export const API_BASE_URL = `${API_BASE_ROOT}${DEFAULT_LANG}/` as const

// If your backend uses cookie-based auth and same-site cookies, set this to true
export const WITH_CREDENTIALS = false as const
