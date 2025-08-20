import { useRef, useCallback } from 'react'

interface ModalCache<T> {
  [key: string]: T
}

export function useModalCache<T extends Record<string, any>>() {
  const cacheRef = useRef<ModalCache<T>>({})

  const saveToCache = useCallback((key: string, data: T) => {
    cacheRef.current[key] = { ...data }
  }, [])

  const getFromCache = useCallback((key: string): T | null => {
    return cacheRef.current[key] || null
  }, [])

  const clearCache = useCallback((key: string) => {
    delete cacheRef.current[key]
  }, [])

  const clearAllCache = useCallback(() => {
    cacheRef.current = {}
  }, [])

  return {
    saveToCache,
    getFromCache,
    clearCache,
    clearAllCache
  }
}
