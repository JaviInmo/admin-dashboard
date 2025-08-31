# Sistema de Caché de Paginación

Este documento explica la implementación del sistema de caché inteligente para las tablas paginadas en el dashboard.

## 🚀 Características Implementadas

### ✅ **Caché Persistente de Páginas**
- Las páginas visitadas se guardan en memoria por **5 minutos**
- Al volver a una página ya visitada, los datos se cargan **instantáneamente desde caché**
- No se realizan llamadas API innecesarias

### ✅ **Prefetch Inteligente**
- **Página siguiente** y **página anterior** se precargan automáticamente
- Mejora la experiencia de usuario al navegar entre páginas
- Prefetch solo cuando los datos actuales están listos

### ✅ **Configuración Optimizada de React Query**
- `staleTime: 5 minutos` - Los datos se consideran frescos por 5 minutos
- `gcTime: 10 minutos` - Los datos se mantienen en memoria por 10 minutos
- `refetchOnWindowFocus: false` - No refetch al enfocar ventana para preservar caché
- `placeholderData` - Mantiene datos anteriores mientras carga nuevos

### ✅ **Indicador Visual de Caché (Desarrollo)**
- Muestra si la página actual viene del caché o del API
- Indicadores visuales de qué páginas están en caché
- Solo visible en modo desarrollo

## 📁 Archivos Modificados

### 🔧 **Configuración Base**
- `src/providers.tsx` - Configuración optimizada de QueryClient
- `src/hooks/use-paginated-query.ts` - Hook personalizado con caché inteligente

### 📊 **Componentes Actualizados**
- `src/components/Clients/client-page.tsx` - Usa nuevo sistema de caché
- `src/components/Guards/guards-page.tsx` - Usa nuevo sistema de caché
- `src/components/ui/cache-indicator.tsx` - Indicador visual de caché

## 🎯 Beneficios

### **Para el Usuario**
- ⚡ **Navegación instantánea** entre páginas ya visitadas
- 🔄 **Menos tiempo de carga** al cambiar páginas
- 📱 **Mejor experiencia móvil** con menos requests

### **Para el Sistema**
- 🌐 **Menos carga en el servidor** - Reduce llamadas API
- 💾 **Uso eficiente de memoria** - Garbage collection automático
- 📈 **Mejor rendimiento** - Prefetch inteligente

## 🔄 Cómo Funciona

### **Flujo de Caché:**
1. **Primera visita** a página → `🌐 Request API` → `💾 Guardar en caché`
2. **Visita posterior** (< 5 min) → `📦 Cargar desde caché` → `⚡ Instantáneo`
3. **Datos stale** (> 5 min) → `🌐 Request API` → `🔄 Actualizar caché`

### **Prefetch Automático:**
- Al cargar página 3 → Se prefetcha página 2 y 4
- Al cargar página 1 → Se prefetcha página 2
- Al cargar última página → Se prefetcha página anterior

### **Gestión de Memoria:**
- Caché activo: **5 minutos** (datos frescos)
- Retención: **10 minutos** (antes de garbage collection)
- Limpieza automática de datos antiguos

## 🔧 Uso del Hook

```typescript
const {
  data,           // Items de la página actual
  count,          // Total de items
  totalPages,     // Total de páginas
  page,           // Página actual
  isFetching,     // Estado de loading
  handleSearch,   // Función de búsqueda
  handlePageChange, // Cambio de página
  isPageCached,   // Verificar si página está en caché
} = usePaginatedQuery<ItemType>({
  queryFn: apiFunction,
  queryKey: "items",
  initialPageSize: 10,
  mapSortField: mapFunction,
});
```

## 📊 Métricas Esperadas

### **Reducción de Requests API:**
- **50-70%** menos requests al navegar páginas
- **Instantáneo** para páginas en caché
- **Prefetch** reduce tiempo de carga en 80%

### **Mejora de UX:**
- **0ms** tiempo de carga para páginas en caché
- **Navegación fluida** sin spinners de carga
- **Mejor percepción** de velocidad de la aplicación

## 🚀 Próximas Mejoras

### **Funcionalidades Planeadas:**
- [ ] Caché persistente en localStorage
- [ ] Invalidación selectiva de caché
- [ ] Métricas de hit rate de caché
- [ ] Configuración por usuario de tiempo de caché
- [ ] Optimistic updates

### **Tablas Pendientes:**
- [ ] Properties Table
- [ ] Users Table  
- [ ] Shifts Table

---

**Desarrollado con ❤️ para optimizar la experiencia de usuario**
