import { useState, useCallback } from 'react';

// Interfaz para un servicio en cache
interface CachedService {
  id: number;
  data: any; // Será el objeto Service completo
  timestamp: number;
}

// Clave base para localStorage
const CACHE_KEY = 'services_cache';

// Utilidades para manejar cache de servicios en localStorage
const getServicesFromStorage = (): Map<number, CachedService> => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return new Map();
    
    const parsed = JSON.parse(stored);
    return new Map(Object.entries(parsed).map(([id, service]) => [Number(id), service as CachedService]));
  } catch {
    return new Map();
  }
};

const saveServicesToStorage = (cache: Map<number, CachedService>): void => {
  try {
    const obj = Object.fromEntries(cache);
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Fallar silenciosamente si localStorage no está disponible
  }
};

// Hook para cache de servicios
export const useServicesCache = () => {
  const [cache, setCache] = useState<Map<number, CachedService>>(() => getServicesFromStorage());

  // Obtener un servicio del cache (sin expiración)
  const getFromCache = useCallback((serviceId: number): any | null => {
    const cached = cache.get(serviceId);
    const result = cached ? cached.data : null;
    //console.log(`🔍 Cache lookup servicio ${serviceId}:`, result ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    return result;
  }, [cache]);

  // Guardar un servicio en el cache
  const saveToCache = useCallback((serviceId: number, data: any): void => {
    const newCache = new Map(cache);
    newCache.set(serviceId, {
      id: serviceId,
      data: data,
      timestamp: Date.now()
    });
    
    setCache(newCache);
    saveServicesToStorage(newCache);
    //console.log(`💾 Guardado en cache servicio ${serviceId}:`, data?.name || data?.service_type || data?.id || 'sin nombre');
  }, [cache]);

  // Limpiar un servicio específico del cache
  const removeFromCache = useCallback((serviceId: number): void => {
    const newCache = new Map(cache);
    newCache.delete(serviceId);
    setCache(newCache);
    saveServicesToStorage(newCache);
  }, [cache]);

  // Limpiar todo el cache de servicios
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
    serviceId: number,
    fetcher: () => Promise<any>,
    onUpdate?: (data: any, fromCache: boolean) => void
  ): Promise<any> => {
    // 1. Verificar cache primero y mostrar inmediatamente si existe
    const cached = getFromCache(serviceId);
    if (cached && onUpdate) {
      onUpdate(cached, true); // Actualizar UI inmediatamente con cache
    }
    
    // 2. SIEMPRE hacer petición al backend para obtener datos frescos
    try {
      const freshData = await fetcher();
      
      // 3. Guardar datos frescos en cache
      saveToCache(serviceId, freshData);
      
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
