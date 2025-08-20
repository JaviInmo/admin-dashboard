"use client";

interface SecurityShieldLoaderProps {
  /** Tamaño del escudo */
  size?: "sm" | "md" | "lg";
  /** Velocidad de la animación (en segundos) */
  duration?: number;
  /** Mostrar texto de carga */
  showText?: boolean;
  /** Texto personalizado */
  text?: string;
  /** Clase CSS adicional */
  className?: string;
}

export function SecurityShieldLoader({
  size = "md",
  duration = 2,
  showText = true,
  text = "Cargando datos seguros...",
  className = "",
}: SecurityShieldLoaderProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      {/* Escudo SVG Animado */}
      <div className={`${sizeClasses[size]} relative`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          style={{
            filter: "drop-shadow(0 4px 8px rgba(59, 130, 246, 0.2))",
          }}
        >
          {/* Gradientes */}
          <defs>
            <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#1d4ed8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#1e40af" stopOpacity="1" />
            </linearGradient>
            
            <linearGradient id="glowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Base del escudo (aparece primero) */}
          <path
            d="M50 10 L20 25 L20 50 Q20 70 50 85 Q80 70 80 50 L80 25 Z"
            fill="url(#shieldGradient)"
            stroke="#1e40af"
            strokeWidth="1"
            style={{
              strokeDasharray: "200",
              strokeDashoffset: "200",
              animation: `drawPath ${duration * 0.4}s ease-out forwards`,
            }}
          />

          {/* Brillo exterior */}
          <path
            d="M50 8 L18 23 L18 50 Q18 72 50 87 Q82 72 82 50 L82 23 Z"
            fill="none"
            stroke="url(#glowGradient)"
            strokeWidth="2"
            opacity="0"
            style={{
              animation: `glowPulse ${duration * 0.3}s ease-in-out ${duration * 0.5}s infinite`,
            }}
          />

          {/* Detalles internos del escudo */}
          <g
            style={{
              opacity: "0",
              animation: `fadeIn ${duration * 0.3}s ease-in ${duration * 0.6}s forwards`,
            }}
          >
            {/* Línea central vertical */}
            <line
              x1="50"
              y1="20"
              x2="50"
              y2="70"
              stroke="#ffffff"
              strokeWidth="2"
              opacity="0.8"
            />
            
            {/* Líneas horizontales */}
            <line
              x1="35"
              y1="35"
              x2="65"
              y2="35"
              stroke="#ffffff"
              strokeWidth="1.5"
              opacity="0.6"
            />
            <line
              x1="30"
              y1="50"
              x2="70"
              y2="50"
              stroke="#ffffff"
              strokeWidth="1.5"
              opacity="0.6"
            />
            
            {/* Símbolo de seguridad (candado simplificado) */}
            <rect
              x="42"
              y="42"
              width="16"
              height="12"
              rx="2"
              fill="#ffffff"
              opacity="0.9"
            />
            <path
              d="M46 42 L46 38 Q46 34 50 34 Q54 34 54 38 L54 42"
              fill="none"
              stroke="#1e40af"
              strokeWidth="2"
            />
          </g>

          {/* Partículas de seguridad (puntos que aparecen alrededor) */}
          <g
            style={{
              animation: `securityScan ${duration * 0.5}s ease-in-out ${duration * 0.8}s infinite`,
            }}
          >
            <circle cx="25" cy="30" r="1" fill="#60a5fa" opacity="0">
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur={`${duration * 0.5}s`}
                begin={`${duration * 0.8}s`}
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="75" cy="35" r="1" fill="#60a5fa" opacity="0">
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur={`${duration * 0.5}s`}
                begin={`${duration * 1}s`}
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="65" cy="65" r="1" fill="#60a5fa" opacity="0">
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur={`${duration * 0.5}s`}
                begin={`${duration * 1.2}s`}
                repeatCount="indefinite"
              />
            </circle>
            <circle cx="35" cy="70" r="1" fill="#60a5fa" opacity="0">
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur={`${duration * 0.5}s`}
                begin={`${duration * 1.4}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        </svg>
      </div>

      {/* Texto de carga */}
      {showText && (
        <div className="text-center">
          <p className={`text-muted-foreground font-medium ${textSizeClasses[size]} animate-pulse`}>
            {text}
          </p>
          <div className="flex justify-center gap-1 mt-1">
            <div
              className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default SecurityShieldLoader;
