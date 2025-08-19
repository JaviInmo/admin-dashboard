import React from 'react';
import { Mail } from 'lucide-react';

interface ClickableEmailProps {
  email: string | null | undefined;
  className?: string;
  showIcon?: boolean;
}

export const ClickableEmail: React.FC<ClickableEmailProps> = ({ 
  email, 
  className = "", 
  showIcon = false 
}) => {
  if (!email || email === "-") {
    return <span className={className}>-</span>;
  }

  const handleEmailClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(`mailto:${email}`, '_self');
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 cursor-pointer text-blue-600 hover:text-blue-800 hover:underline ${className}`}
      onClick={handleEmailClick}
      title={`Enviar email a ${email}`}
    >
      {showIcon && <Mail className="h-3 w-3" />}
      <span>{email}</span>
    </span>
  );
};
