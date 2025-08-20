// src/pages/ClientDetailPage.tsx
import { useParams, Navigate } from "react-router-dom";
import ClientPage from "@/components/Clients/client-page";

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  
  if (!clientId) {
    return <Navigate to="/clients" replace />;
  }

  // Convertir el clientId a número y pasarlo al componente ClientPage
  const numericClientId = parseInt(clientId, 10);
  
  if (isNaN(numericClientId)) {
    return <Navigate to="/clients" replace />;
  }

  return <ClientPage />;
}
