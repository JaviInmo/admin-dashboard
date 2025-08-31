interface CacheIndicatorProps {
  page: number;
  count: number;
  totalPages: number;
  isPageCached: (page: number) => boolean;
  className?: string;
}

export function CacheIndicator({ 
  page, 
  count, 
  totalPages, 
  isPageCached,
  className = "text-xs text-muted-foreground"
}: CacheIndicatorProps) {
  // Solo mostrar en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const isCached = isPageCached(page);
  
  return (
    <div className={className}>
      <span className="mr-2">
        Página {page} - {isCached ? '📦 Desde caché' : '🌐 Desde API'}
      </span>
      <span className="text-muted-foreground/70">
        Total: {count} items en {totalPages} páginas
      </span>
      {/* Indicadores de páginas con caché */}
      <div className="mt-1 flex gap-1 flex-wrap">
        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(pageNum => (
          <span
            key={pageNum}
            className={`
              inline-flex items-center justify-center w-5 h-5 text-[10px] rounded
              ${pageNum === page 
                ? 'bg-primary text-primary-foreground' 
                : isPageCached(pageNum)
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'
              }
            `}
            title={`Página ${pageNum} ${pageNum === page ? '(actual)' : isPageCached(pageNum) ? '(en caché)' : '(no cargada)'}`}
          >
            {pageNum}
          </span>
        ))}
        {totalPages > 10 && (
          <span className="text-[10px] text-muted-foreground/50 ml-1">
            +{totalPages - 10} más
          </span>
        )}
      </div>
    </div>
  );
}
