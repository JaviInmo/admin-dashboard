// src/lib/constants.ts
// Centralized constants for a frontend-only project.
// Use Texas Patrol backend for online functionality.

// Root without locale; locale will be appended dynamically (e.g., /en/ or /es/)
// Use Texas Patrol backend
export const API_BASE_ROOT = 'https://texaspatrol.cyvy.online/'

export const DEFAULT_LANG = 'en' as const

// Initial base URL (will be updated dynamically based on environment and language)
export const API_BASE_URL = `${API_BASE_ROOT}${DEFAULT_LANG}/` as const


// If your backend uses cookie-based auth and same-site cookies, set this to true
export const WITH_CREDENTIALS = false as const
