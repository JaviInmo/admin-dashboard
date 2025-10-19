// src/hooks/use-intelligent-columns.ts
import { useState, useEffect, useCallback, useRef } from "react";
import type { Column } from "@/components/ui/reusable-table";

interface IntelligentColumnStrategy {
  type: 'homogeneous' | 'content-based' | 'sacrifice';
  widths: string[];
  hiddenColumns: number[];
}

// Función para medir el ancho del texto
const measureTextWidth = (text: string, fontSize = '14px', fontFamily = 'system-ui'): number => {
  if (typeof window === 'undefined') return 100; // SSR fallback
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return 100;
  
  context.font = `${fontSize} ${fontFamily}`;
  return context.measureText(text).width;
};

// Calcular ancho mínimo considerando header y contenido
const calculateMinWidth = <T>(column: Column<T>, data: T[]): number => {
  // 1. Medir el header
  const headerWidth = measureTextWidth(column.label);
  
  // 2. Medir una muestra del contenido (máximo 10 elementos para performance)
  const sampleData = data.slice(0, 10);
  const contentWidths = sampleData.map(item => {
    let content = '';
    
    if (column.render) {
      // Si hay render personalizado, necesitamos el texto plano
      const rendered = column.render(item);
      content = typeof rendered === 'string' ? rendered : String(rendered) || '';
    } else {
      content = String(item[column.key] || '');
    }
    
    return measureTextWidth(content);
  });
  
  const maxContentWidth = Math.max(...contentWidths, 0);
  
  // 3. El mínimo es el mayor entre header y contenido + padding
  const padding = 32; // padding interno de la celda
  return Math.max(headerWidth, maxContentWidth) + padding;
};

// Determinar qué columnas sacrificar según prioridad
const getSacrificeOrder = <T>(columns: Column<T>[]): number[] => {
  const sacrificeOrder: number[] = [];
  
  // Buscar columnas de dirección (índice o por key/label)
  const addressIndex = columns.findIndex(col => 
    String(col.key).toLowerCase().includes('address') ||
    col.label.toLowerCase().includes('address') ||
    col.label.toLowerCase().includes('dirección')
  );
  
  if (addressIndex !== -1) {
    sacrificeOrder.push(addressIndex);
  }
  
  // Buscar columnas de email
  const emailIndex = columns.findIndex(col => 
    String(col.key).toLowerCase().includes('email') ||
    col.label.toLowerCase().includes('email') ||
    col.label.toLowerCase().includes('correo')
  );
  
  if (emailIndex !== -1 && !sacrificeOrder.includes(emailIndex)) {
    sacrificeOrder.push(emailIndex);
  }
  
  return sacrificeOrder;
};

export const useIntelligentColumns = <T extends Record<string, any>>(
  columns: Column<T>[],
  data: T[],
  containerRef: React.RefObject<HTMLElement>
) => {
  const [strategy, setStrategy] = useState<IntelligentColumnStrategy>({
    type: 'homogeneous',
    widths: columns.map(() => `${100 / columns.length}%`),
    hiddenColumns: []
  });
  
  const resizeTimeoutRef = useRef<number | null>(null);
  
  const calculateStrategy = useCallback((availableWidth: number): IntelligentColumnStrategy => {
    if (availableWidth <= 0) {
      return {
        type: 'homogeneous',
        widths: columns.map(() => `${100 / columns.length}%`),
        hiddenColumns: []
      };
    }
    
    // Calcular anchos mínimos para todas las columnas
    const minWidths = columns.map(column => calculateMinWidth(column, data));
    const totalMinWidth = minWidths.reduce((sum, width) => sum + width, 0);
    
    // Agregar espacio para acciones si existen (estimado)
    const actionsWidth = 120; // ancho estimado para columna de acciones
    const totalRequiredWidth = totalMinWidth + actionsWidth;
    
    // Estrategia 1: ¿Caben todas las columnas homogéneamente?
    const homogeneousWidth = availableWidth / columns.length;
    const canFitHomogeneous = minWidths.every(minWidth => minWidth <= homogeneousWidth);
    
    if (canFitHomogeneous && availableWidth >= totalRequiredWidth * 1.2) {
      return {
        type: 'homogeneous',
        widths: columns.map(() => `${100 / columns.length}%`),
        hiddenColumns: []
      };
    }
    
    // Estrategia 2: ¿Caben todas con ancho basado en contenido?
    if (availableWidth >= totalRequiredWidth) {
      const totalProportion = minWidths.reduce((sum, width) => sum + width, 0);
      const widths = minWidths.map(width => `${(width / totalProportion) * 100}%`);
      
      return {
        type: 'content-based',
        widths,
        hiddenColumns: []
      };
    }
    
    // Estrategia 3: Sacrificar columnas
    const sacrificeOrder = getSacrificeOrder(columns);
    const hiddenColumns: number[] = [];
    const visibleMinWidths = [...minWidths];
    
    // Intentar ocultar columnas hasta que quepa
    for (const sacrificeIndex of sacrificeOrder) {
      hiddenColumns.push(sacrificeIndex);
      visibleMinWidths[sacrificeIndex] = 0; // No ocupa espacio
      
      const newTotalWidth = visibleMinWidths.reduce((sum, width) => sum + width, 0) + actionsWidth;
      
      if (availableWidth >= newTotalWidth) {
        break;
      }
    }
    
    // Calcular anchos para columnas visibles
    const visibleIndices = columns.map((_, index) => index).filter(index => !hiddenColumns.includes(index));
    const visibleTotalMin = visibleIndices.reduce((sum, index) => sum + minWidths[index], 0);
    
    const widths = columns.map((_, index) => {
      if (hiddenColumns.includes(index)) {
        return '0px';
      }
      const proportion = minWidths[index] / visibleTotalMin;
      return `${proportion * 100}%`;
    });
    
    return {
      type: 'sacrifice',
      widths,
      hiddenColumns
    };
  }, [columns, data]);
  
  const updateStrategy = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const newStrategy = calculateStrategy(containerWidth);
    setStrategy(newStrategy);
  }, [calculateStrategy, containerRef]);
  
  useEffect(() => {
    const updateWithDebounce = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = window.setTimeout(updateStrategy, 100);
    };
    
    // Inicial
    updateStrategy();
    
    // ResizeObserver para detectar cambios de tamaño
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(updateWithDebounce);
    resizeObserver.observe(containerRef.current);
    
    // Window resize como fallback
    window.addEventListener('resize', updateWithDebounce);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWithDebounce);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [updateStrategy, containerRef]);
  
  return strategy;
};
