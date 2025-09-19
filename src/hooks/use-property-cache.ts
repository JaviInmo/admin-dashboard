import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheData<T> {
  timestamp: number;
  data: T;
  version: string;
}

interface CacheOptions {
  maxAge?: number; // en milisegundos, default: 5 minutos
  version?: string; // versión del cache para invalidar cuando cambie
  staleWhileRevalidate?: boolean; // default: true
}

const DEFAULT_MAX_AGE = 5 * 60 * 1000; // 5 minutos
const CACHE_VERSION = '1.0.0';

function getCacheKey(key: string): string {
  return `property-shifts-cache-${key}`;
}

function getFromCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(getCacheKey(key));
    if (!cached) return null;
    
    const parsed: CacheData<T> = JSON.parse(cached);
    
    // Verificar versión
    if (parsed.version !== CACHE_VERSION) {
      localStorage.removeItem(getCacheKey(key));
      return null;
    }
    
    return parsed.data;
  } catch {
    return null;
  }
}

function setToCache<T>(key: string, data: T): void {
  try {
    const cacheData: CacheData<T> = {
      timestamp: Date.now(),
      data,
      version: CACHE_VERSION
    };
    localStorage.setItem(getCacheKey(key), JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
}

function isCacheValid(key: string, maxAge: number = DEFAULT_MAX_AGE): boolean {
  try {
    const cached = localStorage.getItem(getCacheKey(key));
    if (!cached) return false;
    
    const parsed: CacheData<any> = JSON.parse(cached);
    
    // Verificar versión
    if (parsed.version !== CACHE_VERSION) return false;
    
    // Verificar edad
    return Date.now() - parsed.timestamp < maxAge;
  } catch {
    return false;
  }
}

export function usePropertyCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const {
    maxAge = DEFAULT_MAX_AGE,
    staleWhileRevalidate = true
  } = options;

  const [data, setData] = useState<T | null>(() => getFromCache<T>(key));
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async (background = false) => {
    try {
      if (!background) setLoading(true);
      setError(null);
      
      const result = await fetcher();
      
      if (isMountedRef.current) {
        setData(result);
        setToCache(key, result);
        if (!background) setLoading(false);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err as Error);
        if (!background) setLoading(false);
      }
    }
  }, [key, fetcher]);

  const revalidate = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  const mutate = useCallback((newData: T | ((prev: T | null) => T)) => {
    const updatedData = typeof newData === 'function' 
      ? (newData as (prev: T | null) => T)(data)
      : newData;
    
    setData(updatedData);
    setToCache(key, updatedData);
  }, [key, data]);

  useEffect(() => {
    isMountedRef.current = true;
    
    const cachedData = getFromCache<T>(key);
    const isValid = isCacheValid(key, maxAge);
    
    if (cachedData && isValid) {
      // Datos válidos en cache
      setData(cachedData);
      setLoading(false);
    } else if (cachedData && staleWhileRevalidate) {
      // Datos obsoletos pero usar mientras revalidamos
      setData(cachedData);
      setLoading(false);
      fetchData(true); // Revalidar en background
    } else {
      // Sin cache o datos muy antiguos
      fetchData(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [key, maxAge, staleWhileRevalidate, fetchData]);

  return {
    data,
    loading,
    error,
    revalidate,
    mutate,
    isStale: !isCacheValid(key, maxAge)
  };
}

// Hook específico para múltiples claves de cache
export function useMultiplePropertyCache<T extends Record<string, any>>(
  cacheKeys: Record<keyof T, { fetcher: () => Promise<any>; options?: CacheOptions }>
) {
  const results: Record<keyof T, any> = {} as any;
  
  for (const [key, config] of Object.entries(cacheKeys)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[key as keyof T] = usePropertyCache(
      key,
      config.fetcher,
      config.options
    );
  }

  const loading = Object.values(results).some(r => r.loading);
  const hasError = Object.values(results).some(r => r.error);
  
  const data = Object.keys(cacheKeys).reduce((acc, key) => {
    acc[key as keyof T] = results[key as keyof T].data;
    return acc;
  }, {} as any);

  const revalidateAll = useCallback(() => {
    return Promise.all(
      Object.values(results).map(r => r.revalidate())
    );
  }, [results]);

  return {
    data,
    loading,
    error: hasError,
    results,
    revalidateAll
  };
}

// Función para limpiar cache
export function clearPropertyCache(pattern?: string) {
  const keys = Object.keys(localStorage);
  const cacheKeys = keys.filter(key => 
    key.startsWith('property-shifts-cache-') && 
    (!pattern || key.includes(pattern))
  );
  
  cacheKeys.forEach(key => localStorage.removeItem(key));
}
