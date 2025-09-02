// src/routes/AppRouter.tsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard-layout";
import LoginPageRouter from "../pages/LoginPageRouter";
import DashboardPage from "../pages/DashboardPage";
import ClientsPage from "../pages/ClientsPage";
import GuardsPage from "../pages/GuardsPage";
import PropertiesPage from "../pages/PropertiesPage";
import UsersPage from "../pages/UsersPage";
import ClientDetailPage from "../pages/ClientDetailPage";
import ShiftsPage from "../pages/ShiftsPage";
import { getAccessToken } from "@/lib/auth-storage";

// Función helper para verificar si el usuario está autenticado
const isAuthenticated = () => {
  try {
    if (typeof window === 'undefined') return false;
    // Verificar tanto el token como el flag de autenticación
    const hasToken = !!getAccessToken();
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    return hasToken && isLoggedIn;
  } catch {
    return false;
  }
};

// Componente para rutas protegidas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Si no hay window (SSR), renderizar children y dejar que el cliente maneje la redirección
  if (typeof window === 'undefined') {
    return <>{children}</>;
  }
  
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
};

// Configuración del router
export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPageRouter />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardLayout onLogout={() => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('isLoggedIn');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_user');
          window.location.href = '/login';
        }} />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "clients",
        element: <ClientsPage />,
      },
      {
        path: "clients/:clientId",
        element: <ClientDetailPage />,
      },
      {
        path: "guards",
        element: <GuardsPage />,
      },
      {
        path: "properties",
        element: <PropertiesPage />,
      },
      {
        path: "shifts",
        element: <ShiftsPage />,
      },
      {
        path: "users",
        element: <UsersPage />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
