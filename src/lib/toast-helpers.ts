import { toast } from "sonner";
import { CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import React from "react";

/**
 * Toast moderno de éxito con icono y estilo personalizado
 */
export function showSuccessToast(message: string, description?: string) {
  return toast.success(message, {
    description,
    icon: React.createElement(CheckCircle, { size: 20 }),
    duration: 4000,
    className: "modern-toast",
    style: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      border: 'none',
      color: 'white',
      boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.2), 0 10px 10px -5px rgba(16, 185, 129, 0.1)',
    },
  });
}

/**
 * Toast moderno de error con icono y estilo personalizado
 */
export function showErrorToast(message: string, description?: string) {
  return toast.error(message, {
    description,
    icon: React.createElement(AlertCircle, { size: 20 }),
    duration: 5000,
    className: "modern-toast",
    style: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      border: 'none',
      color: 'white',
      boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.2), 0 10px 10px -5px rgba(239, 68, 68, 0.1)',
    },
  });
}

/**
 * Toast moderno de información con icono y estilo personalizado
 */
export function showInfoToast(message: string, description?: string) {
  return toast.info(message, {
    description,
    icon: React.createElement(Info, { size: 20 }),
    duration: 4000,
    className: "modern-toast",
    style: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      border: 'none',
      color: 'white',
      boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.2), 0 10px 10px -5px rgba(59, 130, 246, 0.1)',
    },
  });
}

/**
 * Toast moderno de advertencia con icono y estilo personalizado
 */
export function showWarningToast(message: string, description?: string) {
  return toast.warning(message, {
    description,
    icon: React.createElement(AlertTriangle, { size: 20 }),
    duration: 4000,
    className: "modern-toast",
    style: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      border: 'none',
      color: 'white',
      boxShadow: '0 20px 25px -5px rgba(245, 158, 11, 0.2), 0 10px 10px -5px rgba(245, 158, 11, 0.1)',
    },
  });
}

/**
 * Toast especializado para creación exitosa de entidades
 */
export function showCreatedToast(entityName: string, itemName?: string) {
  const message = `${entityName} creado exitosamente`;
  const description = itemName ? `${itemName} ha sido agregado al sistema` : undefined;
  
  return showSuccessToast(message, description);
}

/**
 * Toast especializado para actualización exitosa de entidades
 */
export function showUpdatedToast(entityName: string, itemName?: string) {
  const message = `${entityName} actualizado exitosamente`;
  const description = itemName ? `Los cambios en ${itemName} han sido guardados` : undefined;
  
  return showSuccessToast(message, description);
}

/**
 * Toast especializado para eliminación exitosa de entidades
 */
export function showDeletedToast(entityName: string, itemName?: string) {
  const message = `${entityName} eliminado exitosamente`;
  const description = itemName ? `${itemName} ha sido removido del sistema` : undefined;
  
  return showSuccessToast(message, description);
}
