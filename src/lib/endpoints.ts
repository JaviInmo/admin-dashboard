// src/lib/endpoints.ts
export const endpoints = {
  auth: {
    login: 'api/auth/login/',
    logout: 'api/auth/logout/',
    me: 'api/auth/me/',
    refresh: 'api/auth/refresh/',
  },
  users: 'api/users/',
  clients: 'api/clients/',
  guards: 'api/guards/',
  permissions: 'api/v1/permissions/admin',
  properties: 'api/properties/',
  propertyTypesOfService: 'api/property-types-of-service/',
  common: {
    generalSettings: 'api/common/general-settings/',
  },
}

export type Endpoints = typeof endpoints
