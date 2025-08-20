"use client";

import { SecurityShieldLoader } from "./security-shield-loader";

interface TableLoadingOverlayProps {
  /** Número de filas skeleton a mostrar */
  skeletonRows?: number;
  /** Número de columnas */
  columns?: number;
  /** Mostrar el overlay con escudo */
  showOverlay?: boolean;
  /** Texto de loading personalizado */
  loadingText?: string;
  /** Tipo de loading - primera carga vs cambio de página */
  loadingType?: "initial" | "pagination" | "search";
}

export function TableLoadingOverlay({
  skeletonRows = 3,
  columns = 4,
  showOverlay = true,
  loadingText,
  loadingType = "initial",
}: TableLoadingOverlayProps) {
  const getLoadingText = () => {
    if (loadingText) return loadingText;
    
    switch (loadingType) {
      case "initial":
        return "Cargando datos seguros...";
      case "pagination":
        return "Cargando página...";
      case "search":
        return "Buscando registros...";
      default:
        return "Cargando...";
    }
  };

  const getLoadingDuration = () => {
    switch (loadingType) {
      case "pagination":
      case "search":
        return 1.2; // Más rápido para cambios
      default:
        return 2; // Normal para carga inicial
    }
  };

  return (
    <div className="relative">
      {/* Skeleton Rows */}
      <div className="space-y-2">
        {Array.from({ length: skeletonRows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 items-center p-2">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-4 bg-muted rounded animate-pulse"
                style={{
                  width: colIndex === 0 ? "20%" : colIndex === columns - 1 ? "15%" : "25%",
                  animationDelay: `${(rowIndex * 100) + (colIndex * 50)}ms`,
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Loading Overlay */}
      {showOverlay && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
          <div className="bg-card/90 border border-border/50 rounded-lg p-6 shadow-lg backdrop-blur-sm">
            <SecurityShieldLoader
              size={loadingType === "initial" ? "lg" : "md"}
              duration={getLoadingDuration()}
              text={getLoadingText()}
              className="security-shield-loader"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TableLoadingOverlay;
