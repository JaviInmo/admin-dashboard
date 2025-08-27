"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { shouldShowPage } from "../_utils/pagination";
import { useI18n } from "@/i18n";

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
  /** Valores de display para mantener estabilidad durante la carga */
  displayCurrentPage?: number;
  displayTotalPages?: number;
}

export function ReusablePagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showFirstLast = false,
  showPageInfo = true,
  pageInfoText,
  size = "sm",
  variant = "outline",
  displayCurrentPage,
  displayTotalPages,
}: ReusablePaginationProps) {
  const { TEXT, lang } = useI18n();

  // Textos de paginación desde i18n (fallbacks)
  const PAG = TEXT?.pagination ?? {
    goToPlaceholder: lang === "es" ? "Ir a..." : "Go to...",
    ariaFirst: lang === "es" ? "Ir a la primera página" : "Go to first page",
    ariaPrev: lang === "es" ? "Página anterior" : "Previous page",
    ariaNext: lang === "es" ? "Página siguiente" : "Next page",
    ariaLast: lang === "es" ? "Ir a la última página" : "Go to last page",
    inputAriaLabel: lang === "es" ? "Ir a página específica" : "Go to specific page",
    pageInfo: lang === "es" ? "{current} de {total}" : "{current} of {total}",
  };

  // Estado para el campo de búsqueda de páginas
  const [pageInput, setPageInput] = useState("");

  // Usar valores de display si están disponibles, sino usar los valores normales
  const effectiveCurrentPage = displayCurrentPage ?? currentPage;
  const effectiveTotalPages = displayTotalPages ?? totalPages;

  // Validar props usando los valores efectivos
  const validCurrentPage = Math.max(1, Math.min(effectiveCurrentPage, effectiveTotalPages));
  const validTotalPages = Math.max(1, effectiveTotalPages);

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

  // Manejar búsqueda de páginas con Enter (para números fuera del rango)
  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      let inputPage = parseInt(pageInput);

      if (!isNaN(inputPage)) {
        // Validar y corregir el rango si está fuera
        if (inputPage < 1) {
          inputPage = 1;
        } else if (inputPage > validTotalPages) {
          inputPage = validTotalPages;
        }

        // Navegar a la página (corregida si era necesario)
        goToPage(inputPage);

        // Limpiar el input
        setPageInput("");
      }
    }
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Solo permitir números (incluyendo string vacío para poder borrar)
    if (value === "" || /^\d+$/.test(value)) {
      setPageInput(value);

      // Si el valor es un número válido, validar y ajustar si está fuera del rango
      if (value !== "") {
        let inputPage = parseInt(value);
        if (!isNaN(inputPage)) {
          // Aplicar validación de mínimo y máximo
          if (inputPage < 1) {
            inputPage = 1;
          } else if (inputPage > validTotalPages) {
            inputPage = validTotalPages;
          }

          // Cambiar a la página validada
          goToPage(inputPage);

          // Actualizar el input con el valor corregido si fue ajustado
          if (inputPage !== parseInt(value)) {
            setPageInput(inputPage.toString());
          }
        }
      }
    }
  };

  // Manejar cuando el usuario pierde el foco del input
  const handlePageInputBlur = () => {
    // Limpiar el input cuando pierde el foco
    setPageInput("");
  };

  // Page info formatter: si el usuario pasó pageInfoText lo usamos, si no, usamos la plantilla i18n
  const defaultPageInfo = (current: number, total: number) =>
    (PAG.pageInfo ?? "{current} of {total}").replace("{current}", String(current)).replace("{total}", String(total));
  const pageInfoFormatter = pageInfoText ?? defaultPageInfo;

  return (
    <div className={cn("flex items-center justify-center space-x-1 w-full", className)}>
      {/* Campo de búsqueda de páginas */}
      <div className="flex items-center space-x-2 mr-4">
        <Input
          type="text"
          value={pageInput}
          onChange={handlePageInputChange}
          onKeyDown={handlePageInputSubmit}
          onBlur={handlePageInputBlur}
          placeholder={PAG.goToPlaceholder}
          className="w-20 h-8 text-center text-sm"
          aria-label={PAG.inputAriaLabel}
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
            validCurrentPage <= 1 ? "cursor-not-allowed opacity-50" : "hover:bg-primary hover:text-primary-foreground"
          )}
          aria-label={PAG.ariaFirst}
          title={PAG.ariaFirst}
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
          validCurrentPage <= 1 ? "cursor-not-allowed opacity-50" : "hover:bg-primary hover:text-primary-foreground"
        )}
        aria-label={PAG.ariaPrev}
        title={PAG.ariaPrev}
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
              page === validCurrentPage ? "bg-primary text-primary-foreground pointer-events-none" : "hover:bg-primary hover:text-primary-foreground"
            )}
            aria-label={`${PAG.inputAriaLabel} ${page}`}
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
          validCurrentPage >= validTotalPages ? "cursor-not-allowed opacity-50" : "hover:bg-primary hover:text-primary-foreground"
        )}
        aria-label={PAG.ariaNext}
        title={PAG.ariaNext}
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
            validCurrentPage >= validTotalPages ? "cursor-not-allowed opacity-50" : "hover:bg-primary hover:text-primary-foreground"
          )}
          aria-label={PAG.ariaLast}
          title={PAG.ariaLast}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      )}

      {/* Información de página */}
      {showPageInfo && (
        <div className="ml-4 text-sm text-muted-foreground whitespace-nowrap">
          {pageInfoFormatter(validCurrentPage, validTotalPages)}
        </div>
      )}
    </div>
  );
}
