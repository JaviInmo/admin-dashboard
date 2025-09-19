import { useState, useCallback } from 'react';

// Interfaz para una propiedad en cache
interface CachedProperty {
  id: number;
  data: any; // Será el objeto Property completo
  timestamp: number;
}

// Clave base para localStorage
const CACHE_KEY = 'properties_cache';

// Utilidades para manejar cache de propiedades en localStorage
const getPropertiesFromStorage = (): Map<number, CachedProperty> => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return new Map();
    
    const parsed = JSON.parse(stored);
    return new Map(Object.entries(parsed).map(([id, prop]) => [Number(id), prop as CachedProperty]));
  } catch {
    return new Map();
  }
};

const savePropertiesToStorage = (cache: Map<number, CachedProperty>): void => {
  try {
    const obj = Object.fromEntries(cache);
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Fallar silenciosamente si localStorage no está disponible
  }
};

// Hook para cache de propiedades
export const usePropertiesCache = () => {
  const [cache, setCache] = useState<Map<number, CachedProperty>>(() => getPropertiesFromStorage());

  // Obtener una propiedad del cache (sin expiración)
  const getFromCache = useCallback((propertyId: number): any | null => {
    const cached = cache.get(propertyId);
    const result = cached ? cached.data : null;
    //console.log(`🔍 Cache lookup propiedad ${propertyId}:`, result ? '✅ ENCONTRADA' : '❌ NO ENCONTRADA');
    return result;
  }, [cache]);

  // Guardar una propiedad en el cache
  const saveToCache = useCallback((propertyId: number, data: any): void => {
    const newCache = new Map(cache);
    newCache.set(propertyId, {
      id: propertyId,
      data: data,
      timestamp: Date.now()
    });
    
    setCache(newCache);
    savePropertiesToStorage(newCache);
    //console.log(`💾 Guardada en cache propiedad ${propertyId}:`, data?.name || data?.id || 'sin nombre');
  }, [cache]);

  // Limpiar una propiedad específica del cache
  const removeFromCache = useCallback((propertyId: number): void => {
    const newCache = new Map(cache);
    newCache.delete(propertyId);
    setCache(newCache);
    savePropertiesToStorage(newCache);
  }, [cache]);

  // Limpiar todo el cache de propiedades
  const clearAllCache = useCallback((): void => {
    setCache(new Map());
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // Fallar silenciosamente
    }
  }, []);

  // Función wrapper que muestra cache primero y luego actualiza con backend
  const fetchWithCache = useCallback(async (
    propertyId: number,
    fetcher: () => Promise<any>,
    onUpdate?: (data: any, fromCache: boolean) => void
  ): Promise<any> => {
    // 1. Verificar cache primero y mostrar inmediatamente si existe
    const cached = getFromCache(propertyId);
    if (cached && onUpdate) {
      onUpdate(cached, true); // Actualizar UI inmediatamente con cache
    }
    
    // 2. SIEMPRE hacer petición al backend para obtener datos frescos
    try {
      const freshData = await fetcher();
      
      // 3. Guardar datos frescos en cache
      saveToCache(propertyId, freshData);
      
      // 4. Actualizar UI con datos frescos (si son diferentes del cache)
      if (onUpdate) {
        onUpdate(freshData, false);
      }
      
      return freshData;
    } catch (error) {
      // Si falla el backend pero hay cache, devolver cache
      if (cached) {
        return cached;
      }
      throw error;
    }
  }, [getFromCache, saveToCache]);

  return {
    getFromCache,
    saveToCache,
    removeFromCache,
    clearAllCache,
    fetchWithCache,
    cacheSize: cache.size
  };
};
