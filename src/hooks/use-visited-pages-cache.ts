import { useRef, useCallback } from 'react';

/**
 * Hook simple para cachear datos de páginas ya visitadas
 * Solo guarda en memoria durante la sesión actual
 */
export function useVisitedPagesCache<T>() {
  // Map para guardar datos por queryKey
  const cacheRef = useRef<Map<string, T>>(new Map());

  // Función para generar key único basado en queryKey array
  const generateKey = useCallback((queryKey: readonly unknown[]): string => {
    return JSON.stringify(queryKey);
  }, []);

  // Función para obtener datos cached
  const get = useCallback((queryKey: readonly unknown[]): T | undefined => {
    const key = generateKey(queryKey);
    return cacheRef.current.get(key);
  }, [generateKey]);

  // Función para guardar datos
  const set = useCallback((queryKey: readonly unknown[], data: T): void => {
    const key = generateKey(queryKey);
    cacheRef.current.set(key, data);
  }, [generateKey]);

  // Función para verificar si existe en caché
  const has = useCallback((queryKey: readonly unknown[]): boolean => {
    const key = generateKey(queryKey);
    return cacheRef.current.has(key);
  }, [generateKey]);

  // Función para limpiar caché (opcional)
  const clear = useCallback((): void => {
    cacheRef.current.clear();
  }, []);

  return {
    get,
    set,
    has,
    clear,
  };
}
