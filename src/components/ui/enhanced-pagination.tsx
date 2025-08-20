"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EnhancedPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function EnhancedPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: EnhancedPaginationProps) {
  const [pageOffset, setPageOffset] = React.useState(0);
  const [isScrolling, setIsScrolling] = React.useState(false);
  const [scrollDirection, setScrollDirection] = React.useState<'left' | 'right' | null>(null);
  const [hoverTimeout, setHoverTimeout] = React.useState<NodeJS.Timeout | null>(null);
  const scrollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const speedRef = React.useRef(1);

  const maxVisiblePages = 7; // Número máximo de páginas visibles

  // Limpiar timeouts e intervalos al desmontar
  React.useEffect(() => {
    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    };
  }, [hoverTimeout]);

  // Calcular páginas visibles basado en offset
  const getVisiblePages = () => {
    const pages: number[] = [];
    const centerPage = Math.max(1, Math.min(totalPages, currentPage + pageOffset));
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let start = Math.max(1, centerPage - halfVisible);
    let end = Math.min(totalPages, centerPage + halfVisible);
    
    // Ajustar si estamos cerca del inicio o final
    if (end - start + 1 < maxVisiblePages && totalPages >= maxVisiblePages) {
      if (start === 1) {
        end = Math.min(totalPages, start + maxVisiblePages - 1);
      } else if (end === totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  // Iniciar desplazamiento
  const startScrolling = (direction: 'left' | 'right') => {
    setIsScrolling(true);
    setScrollDirection(direction);
    speedRef.current = 1;

    const scroll = () => {
      setPageOffset(prev => {
        const increment = direction === 'left' ? -speedRef.current : speedRef.current;
        const newOffset = prev + increment;
        
        // Limitar el desplazamiento
        const minOffset = -(currentPage - 1);
        const maxOffset = totalPages - currentPage;
        const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset));
        
        // Incrementar velocidad gradualmente (efecto aceleración)
        speedRef.current = Math.min(speedRef.current + 0.1, 3);
        
        return clampedOffset;
      });
    };

    // Iniciar scroll inmediatamente y luego cada 100ms
    scroll();
    scrollIntervalRef.current = setInterval(scroll, 100);
  };

  // Detener desplazamiento
  const stopScrolling = () => {
    setIsScrolling(false);
    setScrollDirection(null);
    speedRef.current = 1;
    
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  // Manejar hover en botón anterior
  const handlePrevHover = () => {
    if (currentPage <= 1) return;
    
    if (hoverTimeout) clearTimeout(hoverTimeout);
    
    const timeout = setTimeout(() => {
      startScrolling('left');
    }, 1000);
    
    setHoverTimeout(timeout);
  };

  // Manejar hover en botón siguiente
  const handleNextHover = () => {
    if (currentPage >= totalPages) return;
    
    if (hoverTimeout) clearTimeout(hoverTimeout);
    
    const timeout = setTimeout(() => {
      startScrolling('right');
    }, 1000);
    
    setHoverTimeout(timeout);
  };

  // Manejar salida del hover
  const handleHoverLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    stopScrolling();
    
    // Resetear offset gradualmente
    const resetInterval = setInterval(() => {
      setPageOffset(prev => {
        if (Math.abs(prev) < 0.1) {
          clearInterval(resetInterval);
          return 0;
        }
        return prev * 0.8;
      });
    }, 50);
  };

  const visiblePages = getVisiblePages();

  return (
    <div className={cn("flex items-center justify-center space-x-1", className)}>
      {/* Botón Anterior */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        onMouseEnter={handlePrevHover}
        onMouseLeave={handleHoverLeave}
        className={cn(
          "cursor-pointer transition-all duration-200 relative",
          currentPage <= 1 
            ? "cursor-not-allowed opacity-50" 
            : "hover:bg-primary hover:text-primary-foreground hover:cursor-pointer"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Página anterior</span>
        {isScrolling && scrollDirection === 'left' && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        )}
      </Button>

      {/* Contenedor de páginas con animación de desplazamiento */}
      <div className="flex items-center space-x-1 overflow-hidden">
        <div 
          className="flex items-center space-x-1 transition-transform duration-200 ease-out"
          style={{
            transform: `translateX(${pageOffset * -40}px)` // 40px por página
          }}
        >
          {/* Mostrar páginas adicionales a la izquierda si hay offset */}
          {pageOffset < 0 && Array.from({ length: Math.abs(Math.floor(pageOffset)) }, (_, i) => {
            const page = Math.max(1, visiblePages[0] - (i + 1));
            return page >= 1 ? (
              <Button
                key={`left-${page}`}
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page)}
                className={cn(
                  "cursor-pointer transition-all duration-200 min-w-[2.5rem] opacity-60",
                  "hover:bg-primary hover:text-primary-foreground hover:cursor-pointer hover:opacity-100"
                )}
              >
                {page}
              </Button>
            ) : null;
          })}

          {/* Números de página visibles */}
          {visiblePages.map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={cn(
                "cursor-pointer transition-all duration-200 min-w-[2.5rem]",
                page === currentPage
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-primary hover:text-primary-foreground hover:cursor-pointer"
              )}
            >
              {page}
            </Button>
          ))}

          {/* Mostrar páginas adicionales a la derecha si hay offset */}
          {pageOffset > 0 && Array.from({ length: Math.floor(pageOffset) }, (_, i) => {
            const page = Math.min(totalPages, visiblePages[visiblePages.length - 1] + (i + 1));
            return page <= totalPages ? (
              <Button
                key={`right-${page}`}
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page)}
                className={cn(
                  "cursor-pointer transition-all duration-200 min-w-[2.5rem] opacity-60",
                  "hover:bg-primary hover:text-primary-foreground hover:cursor-pointer hover:opacity-100"
                )}
              >
                {page}
              </Button>
            ) : null;
          })}
        </div>
      </div>

      {/* Botón Siguiente */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        onMouseEnter={handleNextHover}
        onMouseLeave={handleHoverLeave}
        className={cn(
          "cursor-pointer transition-all duration-200 relative",
          currentPage >= totalPages 
            ? "cursor-not-allowed opacity-50" 
            : "hover:bg-primary hover:text-primary-foreground hover:cursor-pointer"
        )}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Página siguiente</span>
        {isScrolling && scrollDirection === 'right' && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        )}
      </Button>

      {/* Información de página actual */}
      <div className="ml-4 text-sm text-muted-foreground">
        {currentPage} de {totalPages}
      </div>
    </div>
  );
}
