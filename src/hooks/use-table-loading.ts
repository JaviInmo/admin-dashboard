"use client";

import { useCallback, useEffect, useState } from "react";

interface UseTableLoadingOptions {
  /** Delay mínimo para mostrar loading (evita flashes) */
  minLoadingDelay?: number;
  /** Timeout automático para resetear loading */
  autoResetTimeout?: number;
  /** Habilitar loading automático en operaciones */
  autoLoading?: boolean;
}

interface UseTableLoadingReturn {
  /** Estado actual de loading */
  isLoading: boolean;
  /** Tipo de loading actual */
  loadingType: "initial" | "pagination" | "search";
  /** Iniciar loading manualmente */
  startLoading: (type?: "initial" | "pagination" | "search") => void;
  /** Detener loading manualmente */
  stopLoading: () => void;
  /** Función wrapper para operaciones automáticas */
  withLoading: <T>(
    operation: () => Promise<T>,
    type?: "initial" | "pagination" | "search"
  ) => Promise<T>;
}

export function useTableLoading(
  options: UseTableLoadingOptions = {}
): UseTableLoadingReturn {
  const {
    minLoadingDelay = 200,
    autoResetTimeout = 3000,
    autoLoading = true,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<"initial" | "pagination" | "search">("initial");
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);

  const startLoading = useCallback((type: "initial" | "pagination" | "search" = "initial") => {
    setIsLoading(true);
    setLoadingType(type);
    setLoadingStartTime(Date.now());
  }, []);

  const stopLoading = useCallback(() => {
    const now = Date.now();
    const elapsedTime = loadingStartTime ? now - loadingStartTime : 0;

    if (elapsedTime < minLoadingDelay) {
      // Si no ha pasado el tiempo mínimo, esperar
      setTimeout(() => {
        setIsLoading(false);
        setLoadingStartTime(null);
      }, minLoadingDelay - elapsedTime);
    } else {
      setIsLoading(false);
      setLoadingStartTime(null);
    }
  }, [minLoadingDelay, loadingStartTime]);

  const withLoading = useCallback(
    async <T>(
      operation: () => Promise<T>,
      type: "initial" | "pagination" | "search" = "initial"
    ): Promise<T> => {
      if (!autoLoading) {
        return operation();
      }

      try {
        startLoading(type);
        const result = await operation();
        stopLoading();
        return result;
      } catch (error) {
        stopLoading();
        throw error;
      }
    },
    [autoLoading, startLoading, stopLoading]
  );

  // Auto-reset timeout
  useEffect(() => {
    if (!isLoading) return;

    const timeout = setTimeout(() => {
      setIsLoading(false);
      setLoadingStartTime(null);
    }, autoResetTimeout);

    return () => clearTimeout(timeout);
  }, [isLoading, autoResetTimeout]);

  return {
    isLoading,
    loadingType,
    startLoading,
    stopLoading,
    withLoading,
  };
}

export default useTableLoading;
