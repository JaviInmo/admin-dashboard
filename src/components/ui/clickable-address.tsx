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

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Dirección copiada al portapapeles');
    } catch (err) {
      console.error('Error al copiar:', err);
      toast.error('Error al copiar la dirección');
    }
  };

  const containerStyle = maxWidth ? { maxWidth } : {};

  return (
    <button
      onClick={handleCopyAddress}
      className={`inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer ${className}`}
      title={`Copiar dirección: ${address}`}
      style={containerStyle}
      aria-label={`Copiar dirección: ${address}`}
      type="button"
    >
      <Copy className="h-4 w-4 text-gray-600 flex-shrink-0" />
      <span className="truncate">{address}</span>
    </button>
  );
};