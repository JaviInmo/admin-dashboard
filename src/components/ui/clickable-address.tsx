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

  const encodedAddress = encodeURIComponent(address);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  const containerStyle = maxWidth ? { maxWidth } : {};

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition-colors ${className}`}
      title={`Abrir en Google Maps: ${address}`}
      style={containerStyle}
      aria-label={`Abrir dirección en Google Maps: ${address}`}
    >
      <MapPin className="h-4 w-4 text-red-600 flex-shrink-0" />
      <span className="truncate">{address}</span>
    </a>
  );
};