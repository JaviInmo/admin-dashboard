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

// Función helper para verificar si el usuario está autenticado
const isAuthenticated = () => {
  try {
    return typeof window !== 'undefined' && localStorage.getItem("isLoggedIn") === "true";
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
        <DashboardLayout />
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
