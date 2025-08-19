import React from 'react';
import { MapPin } from 'lucide-react';

interface ClickableAddressProps {
  address: string | null | undefined;
  className?: string;
  showIcon?: boolean;
  maxWidth?: string;
}

export const ClickableAddress: React.FC<ClickableAddressProps> = ({ 
  address, 
  className = "", 
  showIcon = false,
  maxWidth 
}) => {
  if (!address || address === "-") {
    return <span className={className}>-</span>;
  }

  const handleAddressClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Encode the address for URL
    const encodedAddress = encodeURIComponent(address);
    // Try to open Google Maps
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const containerStyle = maxWidth ? { maxWidth } : {};

  return (
    <span 
      className={`inline-flex items-center gap-1 cursor-pointer text-blue-600 hover:text-blue-800 hover:underline ${className}`}
      onClick={handleAddressClick}
      title={`Abrir en Google Maps: ${address}`}
      style={containerStyle}
    >
      {showIcon && <MapPin className="h-3 w-3 flex-shrink-0" />}
      <span className="truncate">{address}</span>
    </span>
  );
};