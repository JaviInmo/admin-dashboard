import { useState, useCallback } from 'react';

// Interfaz para un turno en cache
interface CachedShift {
  id: number;
  data: any; // Será el objeto Shift completo
  timestamp: number;
}

// Clave base para localStorage
const CACHE_KEY = 'shifts_cache';

// Utilidades para manejar cache de turnos en localStorage
const getShiftsFromStorage = (): Map<number, CachedShift> => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return new Map();
    
    const parsed = JSON.parse(stored);
    return new Map(Object.entries(parsed).map(([id, shift]) => [Number(id), shift as CachedShift]));
  } catch {
    return new Map();
  }
};

const saveShiftsToStorage = (cache: Map<number, CachedShift>): void => {
  try {
    const obj = Object.fromEntries(cache);
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Fallar silenciosamente si localStorage no está disponible
  }
};

// Hook para cache de turnos
export const useShiftsCache = () => {
  const [cache, setCache] = useState<Map<number, CachedShift>>(() => getShiftsFromStorage());

  // Obtener un turno del cache (sin expiración)
  const getFromCache = useCallback((shiftId: number): any | null => {
    const cached = cache.get(shiftId);
    const result = cached ? cached.data : null;
    //console.log(`🔍 Cache lookup turno ${shiftId}:`, result ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    return result;
  }, [cache]);

  // Guardar un turno en el cache
  const saveToCache = useCallback((shiftId: number, data: any): void => {
    const newCache = new Map(cache);
    newCache.set(shiftId, {
      id: shiftId,
      data: data,
      timestamp: Date.now()
    });
    
    setCache(newCache);
    saveShiftsToStorage(newCache);
    //console.log(`💾 Guardado en cache turno ${shiftId}:`, data?.id || 'sin id');
  }, [cache]);

  // Limpiar un turno específico del cache
  const removeFromCache = useCallback((shiftId: number): void => {
    const newCache = new Map(cache);
    newCache.delete(shiftId);
    setCache(newCache);
    saveShiftsToStorage(newCache);
  }, [cache]);

  // Limpiar todo el cache de turnos
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
    shiftId: number,
    fetcher: () => Promise<any>,
    onUpdate?: (data: any, fromCache: boolean) => void
  ): Promise<any> => {
    // 1. Verificar cache primero y mostrar inmediatamente si existe
    const cached = getFromCache(shiftId);
    if (cached && onUpdate) {
      onUpdate(cached, true); // Actualizar UI inmediatamente con cache
    }
    
    // 2. SIEMPRE hacer petición al backend para obtener datos frescos
    try {
      const freshData = await fetcher();
      
      // 3. Guardar datos frescos en cache
      saveToCache(shiftId, freshData);
      
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
