# Componente ReusablePagination

Un componente de paginación reutilizable y personalizable para todas las tablas del proyecto.

## Ubicación
`src/components/ui/reusable-pagination.tsx`

## Características

- ✅ **Reutilizable**: Se puede usar en cualquier tabla o lista paginada
- ✅ **Accesible**: Incluye etiquetas ARIA y navegación por teclado
- ✅ **Personalizable**: Múltiples opciones de configuración
- ✅ **Responsive**: Se adapta a diferentes tamaños de pantalla
- ✅ **Consistente**: Usa la función `shouldShowPage()` existente para mantener la lógica de páginas visibles

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `currentPage` | `number` | - | Página actual (1-indexed) |
| `totalPages` | `number` | - | Total de páginas |
| `onPageChange` | `(page: number) => void` | - | Callback cuando se cambia de página |
| `className` | `string` | - | Clases CSS adicionales |
| `showFirstLast` | `boolean` | `false` | Mostrar botones de ir al inicio/final |
| `showPageInfo` | `boolean` | `true` | Mostrar información de página actual |
| `pageInfoText` | `(current: number, total: number) => string` | `"X de Y"` | Función para personalizar el texto de información |
| `size` | `"sm" \| "default" \| "lg"` | `"sm"` | Tamaño de los botones |
| `variant` | `"default" \| "outline" \| "ghost"` | `"outline"` | Variante de los botones |

## Uso Básico

```tsx
import { ReusablePagination } from "@/components/ui/reusable-pagination";

function MyTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 10;

  return (
    <div>
      {/* Tu tabla aquí */}
      
      <ReusablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
```

## Ejemplos de Configuración

### Configuración Básica
```tsx
<ReusablePagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```

### Configuración Completa
```tsx
<ReusablePagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
  showFirstLast={true}
  showPageInfo={true}
  pageInfoText={(current, total) => `Página ${current} de ${total}`}
  size="default"
  variant="outline"
  className="my-4"
/>
```

### Para Tablas con Server-Side Pagination
```tsx
<ReusablePagination
  currentPage={serverCurrentPage}
  totalPages={serverTotalPages}
  onPageChange={handleServerPageChange}
  showFirstLast={true}
  pageInfoText={(current, total) => `Mostrando página ${current} de ${total}`}
/>
```

## Implementación en Tablas Existentes

### Antes (con componentes shadcn/ui nativos)
```tsx
<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious onClick={() => goToPage(currentPage - 1)} />
    </PaginationItem>
    {/* Lógica compleja de páginas visibles */}
    <PaginationItem>
      <PaginationNext onClick={() => goToPage(currentPage + 1)} />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

### Después (con ReusablePagination)
```tsx
<ReusablePagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={goToPage}
  showFirstLast={true}
/>
```

## Tablas Ya Actualizadas

- ✅ `GuardsTable` - `src/components/Guards/GuardsTable.tsx`
- ✅ `ClientsTable` - `src/components/Clients/clients-table.tsx`

## Tablas Pendientes de Actualizar

- ⏳ `PropertiesTable` - `src/components/Properties/properties-table.tsx`
- ⏳ `UsersTable` - `src/components/Users/UsersTable.tsx`

## Personalización de Estilos

El componente respeta las clases de Tailwind CSS y el sistema de diseño existente. Puedes personalizar:

- **Tamaños**: `size="sm"` | `size="default"` | `size="lg"`
- **Variantes**: `variant="outline"` | `variant="default"` | `variant="ghost"`
- **Clases adicionales**: `className="tu-clase-personalizada"`

## Accesibilidad

El componente incluye:
- Etiquetas ARIA apropiadas (`aria-label`, `aria-current`)
- Soporte para lectores de pantalla
- Estados disabled apropiados
- Indicadores visuales claros del estado actual

## Notas de Desarrollo

- El componente usa la función `shouldShowPage()` existente para mantener consistencia
- Se integra perfectamente con el sistema de diseño shadcn/ui
- No rompe la funcionalidad existente de paginación server-side o client-side
- Incluye validación de props para evitar errores
