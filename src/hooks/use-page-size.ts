import { useState } from "react";

/**
 * Hook para manejar el tamaño de página con persistencia en localStorage
 * @param sectionKey - Clave única para la sección (ej: 'clients', 'guards', 'properties')
 * @param defaultSize - Tamaño por defecto si no hay valor guardado
 */
export function usePageSize(sectionKey: string, defaultSize: number = 5) {
  const storageKey = `pageSize_${sectionKey}`;

  // Función para obtener el valor guardado en localStorage
  const getStoredPageSize = (): number => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        // Validar que sea un número válido y dentro de rangos razonables
        if (!isNaN(parsed) && parsed > 0 && parsed <= 1000) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn(`Error reading pageSize for ${sectionKey}:`, error);
    }
    return defaultSize;
  };

  const [pageSize, setPageSizeState] = useState<number>(getStoredPageSize);

  // Función para actualizar el pageSize y guardarlo en localStorage
  const setPageSize = (newSize: number) => {
    try {
      // Validar el nuevo tamaño
      if (newSize > 0 && newSize <= 1000) {
        setPageSizeState(newSize);
        localStorage.setItem(storageKey, newSize.toString());
      } else {
        console.warn(`Invalid page size: ${newSize}. Must be between 1 and 1000.`);
      }
    } catch (error) {
      console.warn(`Error saving pageSize for ${sectionKey}:`, error);
      // Aún actualizar el estado aunque falle el localStorage
      setPageSizeState(newSize);
    }
  };

  return { pageSize, setPageSize };
}
