"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { shouldShowPage } from "../_utils/pagination";

interface ReusablePaginationProps {
  /** Página actual (1-indexed) */
  currentPage: number;
  /** Total de páginas */
  totalPages: number;
  /** Callback cuando se cambia de página */
  onPageChange: (page: number) => void;
  /** Clases CSS adicionales */
  className?: string;
  /** Mostrar botones de ir al inicio/final */
  showFirstLast?: boolean;
  /** Mostrar información de página actual */
  showPageInfo?: boolean;
  /** Texto personalizable para la información de página */
  pageInfoText?: (current: number, total: number) => string;
  /** Tamaño de los botones */
  size?: "sm" | "default" | "lg";
  /** Variant de los botones */
  variant?: "default" | "outline" | "ghost";
}

export function ReusablePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showFirstLast = false,
  showPageInfo = true,
  pageInfoText = (current, total) => `${current} de ${total}`,
  size = "sm",
  variant = "outline",
}: ReusablePaginationProps) {
  // Estado para el campo de búsqueda de páginas
  const [pageInput, setPageInput] = useState("");
  // Validar props
  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  const validTotalPages = Math.max(1, totalPages);

  // Calcular páginas visibles usando la función existente
  const getVisiblePages = () => {
    const pages: number[] = [];
    for (let i = 1; i <= validTotalPages; i++) {
      if (shouldShowPage(i, validCurrentPage, validTotalPages)) {
        pages.push(i);
      }
    }
    return pages;
  };

  const visiblePages = getVisiblePages();

  // Handlers para navegación
  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(validTotalPages, page));
    if (newPage !== validCurrentPage) {
      onPageChange(newPage);
    }
  };

  const goToFirst = () => goToPage(1);
  const goToLast = () => goToPage(validTotalPages);
  const goToPrevious = () => goToPage(validCurrentPage - 1);
  const goToNext = () => goToPage(validCurrentPage + 1);

  // Manejar búsqueda de páginas
  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      let inputPage = parseInt(pageInput);
      
      if (!isNaN(inputPage)) {
        // Validar y corregir el rango
        if (inputPage < 1) {
          inputPage = 1;
        } else if (inputPage > validTotalPages) {
          inputPage = validTotalPages;
        }
        
        // Mostrar el número corregido en el input brevemente antes de limpiar
        setPageInput(inputPage.toString());
        
        // Navegar a la página (corregida si era necesario)
        goToPage(inputPage);
        
        // Limpiar el input después de un breve delay
        setTimeout(() => {
          setPageInput("");
        }, 500);
      }
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Solo permitir números (incluyendo string vacío para poder borrar)
    if (value === "" || /^\d+$/.test(value)) {
      setPageInput(value);
    }
  };

  // Si solo hay una página, no mostrar paginación
  if (validTotalPages <= 1) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-center space-x-1 w-full", className)}>
      {/* Campo de búsqueda de páginas */}
      <div className="flex items-center space-x-2 mr-4">
        <Input
          type="text"
          value={pageInput}
          onChange={handlePageInputChange}
          onKeyDown={handlePageInputSubmit}
          placeholder="Ir a..."
          className="w-20 h-8 text-center text-sm"
          aria-label="Ir a página específica"
        />
      </div>

      {/* Botón ir al inicio */}
      {showFirstLast && (
        <Button
          variant={variant}
          size={size}
          onClick={goToFirst}
          disabled={validCurrentPage <= 1}
          className={cn(
            "cursor-pointer transition-all duration-200",
            validCurrentPage <= 1 
              ? "cursor-not-allowed opacity-50" 
              : "hover:bg-primary hover:text-primary-foreground"
          )}
          aria-label="Ir a la primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Botón anterior */}
      <Button
        variant={variant}
        size={size}
        onClick={goToPrevious}
        disabled={validCurrentPage <= 1}
        className={cn(
          "cursor-pointer transition-all duration-200",
          validCurrentPage <= 1 
            ? "cursor-not-allowed opacity-50" 
            : "hover:bg-primary hover:text-primary-foreground"
        )}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Páginas visibles */}
      <div className="flex items-center space-x-1">
        {visiblePages.map((page) => (
          <Button
            key={page}
            variant={page === validCurrentPage ? "default" : variant}
            size={size}
            onClick={() => goToPage(page)}
            className={cn(
              "cursor-pointer transition-all duration-200 min-w-[2.5rem]",
              page === validCurrentPage
                ? "bg-primary text-primary-foreground pointer-events-none"
                : "hover:bg-primary hover:text-primary-foreground"
            )}
            aria-label={`Ir a la página ${page}`}
            aria-current={page === validCurrentPage ? "page" : undefined}
          >
            {page}
          </Button>
        ))}
      </div>

      {/* Botón siguiente */}
      <Button
        variant={variant}
        size={size}
        onClick={goToNext}
        disabled={validCurrentPage >= validTotalPages}
        className={cn(
          "cursor-pointer transition-all duration-200",
          validCurrentPage >= validTotalPages
            ? "cursor-not-allowed opacity-50"
            : "hover:bg-primary hover:text-primary-foreground"
        )}
        aria-label="Página siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Botón ir al final */}
      {showFirstLast && (
        <Button
          variant={variant}
          size={size}
          onClick={goToLast}
          disabled={validCurrentPage >= validTotalPages}
          className={cn(
            "cursor-pointer transition-all duration-200",
            validCurrentPage >= validTotalPages
              ? "cursor-not-allowed opacity-50"
              : "hover:bg-primary hover:text-primary-foreground"
          )}
          aria-label="Ir a la última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      )}

      {/* Información de página */}
      {showPageInfo && (
        <div className="ml-4 text-sm text-muted-foreground whitespace-nowrap">
          {pageInfoText(validCurrentPage, validTotalPages)}
        </div>
      )}
    </div>
  );
}
