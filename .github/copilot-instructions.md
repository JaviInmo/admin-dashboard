# Admin Dashboard AI Agent Guidelines

This document provides essential guidance for AI agents working in this codebase.

## Project Architecture

- **Framework**: React + TypeScript + Vite with SWC for Fast Refresh
- **UI Components**: Radix UI primitives with custom styled components in `src/components/ui/`
- **State Management**: React Query for server state, React Context for UI state
- **Routing**: React Router v7 with protected routes
- **API Integration**: Axios with JWT auth and refresh token rotation
- **Styling**: Tailwind CSS with custom configuration

## Key Patterns

### Authentication Flow
- JWT-based auth with refresh token rotation (see `src/lib/http.ts`)
- Protected routes require valid access token
- Tokens stored in local storage with `auth-storage.ts` utilities
- Auto-refresh mechanism in axios interceptors

### Internationalization
- Dual language support (EN/ES) via `src/i18n` context
- Language selection persists in localStorage
- Text keys defined in `src/config/ui-text.[lang].ts`

### Component Architecture
1. **Layout**:
   - Main dashboard layout in `src/components/dashboard-layout.tsx`
   - Sidebar navigation with collapsible states
   - Responsive design with mobile considerations

2. **Data Fetching**:
   - Use React Query hooks from `src/hooks/use-*-cache.ts`
   - Implement pagination via `use-paginated-query.ts`
   - Cache invalidation handled through query keys

3. **Forms & Validation**:
   - Radix UI form primitives (`@radix-ui/react-*`)
   - Consistent error handling and validation patterns

### Module Organization
```
src/
  components/    # Reusable UI components
  hooks/        # Custom React hooks
  lib/          # Core utilities and services
  contexts/     # React context providers
  pages/        # Route components
  config/       # App configuration
  i18n/         # Internationalization
```

## Development Workflow

1. **Local Development**:
   ```bash
   pnpm dev      # Start dev server
   pnpm build    # Production build
   pnpm lint     # Run ESLint
   ```

2. **Code Style**:
   - Follow biome.js configuration in `biome.json`
   - Use TypeScript strict mode
   - Implement proper error boundaries and loading states

## Common Patterns

1. **Data Management**:
   ```typescript
   // Example cache hook pattern
   const { data, isLoading } = usePropertiesCache({
     enabled: true,
     staleTime: 5 * 60 * 1000
   });
   ```

2. **Protected Routes**:
   ```typescript
   // Check auth status and redirect accordingly
   const ProtectedRoute = () => {
     const token = getAccessToken();
     return token ? <Outlet /> : <Navigate to="/login" />;
   };
   ```

3. **Context Usage**:
   ```typescript
   // Example from shifts management
   const { view, setView, rangeType } = useShiftsFilters();
   ```

## Important Files to Review
- `src/lib/http.ts` - API client configuration
- `src/components/dashboard-layout.tsx` - Main app structure
- `src/contexts/shifts-context.tsx` - State management example
- `src/hooks/use-paginated-query.ts` - Data fetching pattern