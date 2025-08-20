// Centralized UI text strings
// You can later split by locale (e.g., en, es) or load dynamically

export const UI_TEXT = {
  appName: "Acme Inc",
  header: {
    notificationsAria: "Notifications",
    userMenuAria: "Toggle user menu",
  },
  sidebar: {
    navigationLabel: "Navigation",
  },
  menu: {
    dashboard: "Dashboard",
    clients: "Clients",
    guards: "Guards",
    users: "Users",
    properties: "Properties",
  },
  common: {
    notFoundTitle: "Contenido no encontrado",
    notFoundDescription: "Selecciona una opción del menú.",
  },
  dashboard: {
    title: "Dashboard Overview",
    chartHoursTitle: "Horas trabajadas por mes",
    chartCostsTitle: "Costos por mes",
    series: {
      priceTotal: "Precio Total",
      fuelCost: "Costo Gasolina",
      guardSalary: "Salario Guardia",
    },
    upcomingShifts: {
      title: "Próximos turnos",
      headers: { guard: "Guardia", location: "Lugar", date: "Fecha" },
      
    },
  },
  clients: {
    title: "Gestión de Clientes",
    table: {
      title: "Lista de Clientes",
      add: "Agregar",
      headers: {
        name: "Nombre",
        properties: "# Propiedades",
        totalPrice: "Precio Total ($)",
        expenses: "Gastos ($)",
        fuel: "Gasolina ($)",
        actions: "Acciones",
      },
       pageSizeLabel: "Items por página",
      actionEdit: "Editar {name}",
      actionDelete: "Eliminar {name}",
    },
    properties: {
      title: "Propiedades de {clientName}",
      headers: {
        name: "Nombre",
        price: "Precio ($)",
        expenses: "Gastos ($)",
        hours: "Horas/Mes",
        fuel: "Gasolina ($)",
        actions: "Acciones",
      },
      actionEdit: "Editar {name}",
      actionDelete: "Eliminar {name}",
    },
  },
  guards: {
    title: "Gestión de Guardias",
    selectPrompt: "Selecciona un guardia para ver sus turnos.",
    weeklyMaxNote: "Nota: los totales se calculan sumando los turnos (hours × pricePerHour). Máx. semanal configurado a {hours}h.",
    table: {
      title: "Lista de Guardias",
      add: "Agregar",
      headers: {
        name: "Nombre",
        totalHours: "Horas Totales",
        totalSalary: "Salario Total ($)",
        actions: "Acciones",
      },
       pageSizeLabel: "Items por página",
      actionEdit: "Editar guardia {name}",
      actionDeleteConfirm: "¿Eliminar guardia {name}?",
      actionDelete: "Eliminar guardia {name}",
    },
  },
  users: {
    title: "Gestión de Usuarios",
    loading: "Cargando usuarios...",
    selectPrompt: "Selecciona un usuario para ver y editar sus permisos.",
    noPermissions: "Sin permisos",
    table: {
      title: "Lista de Usuarios",
      add: "Agregar",
      searchPlaceholder: "Buscar...",
      headers: {
        username: "Username",
        firstName: "Nombre",
        lastName: "Apellido",
        email: "Correo",
        permissions: "Permisos",
        actions: "Acciones",
      },
    },
  },
  properties: {
    title: "Gestión de Propiedades",
    table: {
      title: "Lista de Propiedades",
      add: "Agregar",
      searchPlaceholder: "Buscar...",
      headers: {
        owner: "Propietario",
        name: "Nombre",
        address: "Dirección",
        serviceTypes: "Tipos de Servicio",
        monthlyRate: "Tarifa Mensual",
        totalHours: "Horas Totales",
        startDate: "Fecha Inicio",
        actions: "Acciones",
      },
       pageSizeLabel: "Items por página",
      actionEdit: "Editar {name}",
      actionDelete: "Eliminar {name}",
    },
    form: {
      createTitle: "Crear Propiedad",
      editTitle: "Editar Propiedad",
      fields: {
        ownerUser: "Owner (user id)",
        ownerPhone: "Teléfono propietario",
        name: "Nombre",
        address: "Dirección",
        typesOfService: "Tipos de Servicio",
        monthlyRate: "Tarifa Mensual",
        contractStartDate: "Fecha de inicio del contrato",
        totalHours: "Horas Totales",
      },
      buttons: {
        cancel: "Cancelar",
        create: "Crear",
        save: "Guardar",
        delete: "Eliminar",
      },
    },
  },
  accountMenu: {
    title: "My Account",
    settings: "Settings",
    support: "Support",
    logout: "Logout",
  },
  logoutDialog: {
    title: "Confirm logout",
    description:
      "Are you sure you want to log out? You will need to sign in again to access the dashboard.",
    cancel: "Cancel",
    confirm: "Logout",
    successToast: "Logged out successfully",
  },
  login: {
    title: "Login",
    description: "Enter your username and password to access your account.",
    usernameLabel: "Usuario",
    usernamePlaceholder: "usuario",
    passwordLabel: "Password",
    submit: "Sign in",
    submitting: "Iniciando...",
    errorDefault: "Credenciales incorrectas. Intenta de nuevo.",
  },
} as const
