// src/lib/constants.ts
// Centralized constants for a frontend-only project.
// Update API_BASE_URL as needed per environment.

export const API_BASE_URL = 'https://wr60a2rc2j.execute-api.us-east-2.amazonaws.com/dev/en/' as const

// If your backend uses cookie-based auth and same-site cookies, set this to true
export const WITH_CREDENTIALS = false as const
