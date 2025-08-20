import React from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface ClickableAddressProps {
  address: string | null | undefined;
  className?: string;
  maxWidth?: string;
}

export const ClickableAddress: React.FC<ClickableAddressProps> = ({ 
  address, 
  className = "", 
  maxWidth 
}) => {
  if (!address || address === "-") {
    return <span className={className}>-</span>;
  }

  const handleCopyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se propague al texto
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Dirección copiada al portapapeles');
    } catch (err) {
      console.error('Error al copiar:', err);
      toast.error('Error al copiar la dirección');
    }
  };

  const handleOpenMaps = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se propague a la fila de la tabla
    const encodedAddress = encodeURIComponent(address);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapsUrl, '_blank');
  };

  const containerStyle = maxWidth ? { maxWidth } : {};

  return (
    <div
      className={`inline-flex items-center gap-1 ${className}`}
      style={containerStyle}
    >
      <button
        onClick={handleCopyAddress}
        className="text-gray-600 hover:text-gray-800 transition-colors cursor-pointer p-1"
        title={`Copiar dirección: ${address}`}
        aria-label={`Copiar dirección: ${address}`}
        type="button"
      >
        <Copy className="h-4 w-4 flex-shrink-0" />
      </button>
      <button
        onClick={handleOpenMaps}
        className="text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer truncate"
        title={`Abrir en Google Maps: ${address}`}
        aria-label={`Abrir en Google Maps: ${address}`}
        type="button"
      >
        <span className="truncate">{address}</span>
      </button>
    </div>
  );
};