// src/lib/constants.ts
// Centralized constants for a frontend-only project.
// Update API_BASE_URL as needed per environment.

// Root without locale; locale will be appended dynamically (e.g., /en/ or /es/)
const ENV_API_URL = import.meta.env.VITE_API_BASE_URL
// If VITE_API_BASE_URL is set, use it directly (local development)
// Otherwise use AWS with language path
export const API_BASE_ROOT = ENV_API_URL 
  ? (ENV_API_URL.endsWith('/') ? ENV_API_URL : `${ENV_API_URL}/`)
  : 'https://wr60a2rc2j.execute-api.us-east-2.amazonaws.com/dev/'

export const DEFAULT_LANG = 'en' as const

// Initial base URL (will be updated dynamically based on environment and language)
export const API_BASE_URL = `${API_BASE_ROOT}${DEFAULT_LANG}/` as const


// If your backend uses cookie-based auth and same-site cookies, set this to true
export const WITH_CREDENTIALS = false as const
