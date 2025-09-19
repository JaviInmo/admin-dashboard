import { useState, useCallback } from 'react';

// Interfaz para un guardia en cache
interface CachedGuard {
  id: number;
  data: any; // Será el objeto Guard completo
  timestamp: number;
}

// Clave base para localStorage
const CACHE_KEY = 'guards_cache';

// Utilidades para manejar cache de guardias en localStorage
const getGuardsFromStorage = (): Map<number, CachedGuard> => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return new Map();

    const parsed = JSON.parse(stored);
    return new Map(Object.entries(parsed).map(([id, guard]) => [Number(id), guard as CachedGuard]));
  } catch {
    return new Map();
  }
};

const saveGuardsToStorage = (cache: Map<number, CachedGuard>): void => {
  try {
    const obj = Object.fromEntries(cache);
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Fallar silenciosamente si localStorage no está disponible
  }
};

// Hook para cache de guardias
export const useGuardsCache = () => {
  const [cache, setCache] = useState<Map<number, CachedGuard>>(() => getGuardsFromStorage());

  // Obtener un guardia del cache (sin expiración)
  const getFromCache = useCallback((guardId: number): any | null => {
    const cached = cache.get(guardId);
    const result = cached ? cached.data : null;
    //console.log(`🔍 Cache lookup guardia ${guardId}:`, result ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO');
    return result;
  }, [cache]);

  // Guardar un guardia en el cache
  const saveToCache = useCallback((guardId: number, data: any): void => {
    const newCache = new Map(cache);
    newCache.set(guardId, {
      id: guardId,
      data: data,
      timestamp: Date.now()
    });

    setCache(newCache);
    saveGuardsToStorage(newCache);
    //console.log(`💾 Guardado en cache guardia ${guardId}:`, data?.firstName || data?.name || data?.id || 'sin nombre');
  }, [cache]);

  // Limpiar un guardia específico del cache
  const removeFromCache = useCallback((guardId: number): void => {
    const newCache = new Map(cache);
    newCache.delete(guardId);
    setCache(newCache);
    saveGuardsToStorage(newCache);
  }, [cache]);

  // Limpiar todo el cache de guardias
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
    guardId: number,
    fetcher: () => Promise<any>,
    onUpdate?: (data: any, fromCache: boolean) => void
  ): Promise<any> => {
    // 1. Verificar cache primero y mostrar inmediatamente si existe
    const cached = getFromCache(guardId);
    if (cached && onUpdate) {
      onUpdate(cached, true); // Actualizar UI inmediatamente con cache
    }

    // 2. SIEMPRE hacer petición al backend para obtener datos frescos
    try {
      const freshData = await fetcher();

      // 3. Guardar datos frescos en cache
      saveToCache(guardId, freshData);

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
