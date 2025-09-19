import { useState, useCallback } from 'react';

// Interfaz para datos en cache
interface CachedItem<T> {
  data: T;
  timestamp: number;
}

// TTL por defecto: 10 minutos
const DEFAULT_TTL = 10 * 60 * 1000;

// Utilidades para localStorage
const getCachedItem = <T>(key: string, ttl: number = DEFAULT_TTL): T | null => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const parsed: CachedItem<T> = JSON.parse(cached);
    const isExpired = Date.now() - parsed.timestamp > ttl;
    
    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }
    
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

// Hook simplificado: SOLO cache, NO peticiones automáticas
export const usePassiveCache = <T>(ttl: number = DEFAULT_TTL) => {
  const [loading, setLoading] = useState(false);

  // Función que SOLO hace petición si NO hay cache válido
  const getCachedOrFetch = useCallback(async (
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> => {
    // 1. PRIMERO verificar si hay cache válido
    const cached = getCachedItem<T>(key, ttl);
    
    if (cached) {
      // Si hay cache válido, devolverlo SIN hacer petición
      return cached;
    }
    
    // 2. SOLO si no hay cache, hacer petición
    setLoading(true);
    
    try {
      const freshData = await fetcher();
      
      // 3. Guardar en cache para próxima vez
      setCachedItem(key, freshData);
      
      return freshData;
      
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [ttl]);

  // Función para obtener solo del cache (sin petición)
  const getCachedOnly = useCallback((key: string): T | null => {
    return getCachedItem<T>(key, ttl);
  }, [ttl]);

  return {
    getCachedOrFetch,
    getCachedOnly,
    loading
  };
};

// Función de utilidad para limpiar cache específico
export const clearCacheItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Fallar silenciosamente
  }
};

// Función de utilidad para limpiar todo el cache
export const clearAllCache = (): void => {
  try {
    // Solo borrar keys que empiecen con nuestro prefijo
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('property-') || key.startsWith('services-') || 
          key.startsWith('shifts-') || key.startsWith('guard-')) {
        localStorage.removeItem(key);
      }
    });
  } catch {
    // Fallar silenciosamente
  }
};
