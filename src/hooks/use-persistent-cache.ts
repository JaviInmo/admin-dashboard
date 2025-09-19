import { useState, useCallback } from 'react';

// Interfaz para datos en cache (sin expiración - persistente indefinidamente)
interface CachedItem<T> {
  data: T;
  timestamp: number; // Para debug, no para expiración
}

// Utilidades para localStorage
const getCachedItem = <T>(key: string): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed: CachedItem<T> = JSON.parse(cached);
    return parsed.data;
  } catch {
    return null;
  }
};

const setCachedItem = <T>(key: string, data: T): void => {
  try {
    const item: CachedItem<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch {
    // Fallar silenciosamente si localStorage no está disponible
  }
};

// Hook principal para cache persistente con flujo: cache primero + backend después
export const usePersistentCache = () => {
  const [loading, setLoading] = useState(false);

  const getCachedThenFetch = useCallback(async <T>(
    key: string,
    fetcher: () => Promise<T>,
    onUpdate: (data: T, fromCache: boolean) => void
  ): Promise<T> => {
    setLoading(true);
    
    try {
      // 1. Verificar cache primero y mostrar INMEDIATAMENTE si existe
      const cached = getCachedItem<T>(key);
      if (cached) {
        onUpdate(cached, true); // UI se actualiza instantáneamente
      }
      
      // 2. SIEMPRE hacer petición al backend para datos frescos
      const freshData = await fetcher();
      
      // 3. Actualizar UI con datos frescos del backend
      onUpdate(freshData, false);
      
      // 4. Guardar/actualizar en cache para próximas veces
      setCachedItem(key, freshData);
      
      return freshData;
      
    } catch (error) {
      // Si falla la petición pero hay cache, mantener cache visible
      const cached = getCachedItem<T>(key);
      if (cached) {
        console.warn(`Backend failed for ${key}, using cached data:`, error);
        return cached;
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Función para obtener solo desde cache (sin hacer petición)
  const getCachedOnly = useCallback(<T>(key: string): T | null => {
    return getCachedItem<T>(key);
  }, []);

  // Función para invalidar cache específico
  const invalidateCache = useCallback((key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Fallar silenciosamente
    }
  }, []);

  // Función para actualizar cache directamente (útil para CRUD)
  const updateCache = useCallback(<T>(key: string, data: T): void => {
    setCachedItem(key, data);
  }, []);

  return {
    getCachedThenFetch,
    getCachedOnly,
    invalidateCache,
    updateCache,
    loading
  };
};

// Función de utilidad para limpiar todo el cache de la app
export const clearAllAppCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('app-') || key.startsWith('property-') || 
          key.startsWith('services-') || key.startsWith('shifts-') || 
          key.startsWith('guards-')) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Fallar silenciosamente
  }
};
