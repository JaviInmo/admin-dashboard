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
  guards_property_tariffs: 'api/guards-preperty-tariffs/',
  permissions: 'api/v1/permissions/admin',
  properties: 'api/properties/',
  propertyTypesOfService: 'api/property-types-of-service/',
  shifts: 'api/shifts/',

  // services
  services: 'api/services/',
  services_by_guard: 'api/services/by_guard/',
  services_by_property: 'api/services/by_property/',

  common: {
    generalSettings: 'api/common/general-settings/',
  },

  // weapons 
  weapons: 'api/weapons/',
};
export type Endpoints = typeof endpoints;
