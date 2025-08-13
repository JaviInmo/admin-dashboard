// src/lib/endpoints.ts
// Centralized endpoint paths. Keep all paths here for consistency.

export const endpoints = {
  auth: {
    // Provided by user: POST to 'api/auth/' returns { access, refresh, user }
    login: 'api/auth/login/',
    logout: 'api/auth/logout/',
    me: 'api/auth/me/',
    refresh: 'api/auth/refresh/',
  },
  // Adjust these if your backend paths differ
  users: 'api/users/',
  clients: 'api/clients/',
  guards: 'api/guards/',
  permissions: 'api/v1/permissions/admin',
  common: {
    // Returns { app_name, app_description }
    generalSettings: 'api/common/general-settings/',
  },
}

export type Endpoints = typeof endpoints
