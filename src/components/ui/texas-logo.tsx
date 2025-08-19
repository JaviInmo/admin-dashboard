import * as React from "react";

interface TexasLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const TexasLogo: React.FC<TexasLogoProps> = ({ className, ...props }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Shield outline */}
      <path
        d="M50 5 L85 25 L85 60 Q85 75 50 95 Q15 75 15 60 L15 25 Z"
        fill="#1a1a1a"
        stroke="#d4af37"
        strokeWidth="2"
      />
      
      {/* Inner shield with gradient */}
      <defs>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2c1810" />
          <stop offset="50%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#0f0f0f" />
        </linearGradient>
        <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#b8941f" />
        </linearGradient>
      </defs>
      
      <path
        d="M50 8 L82 26 L82 58 Q82 72 50 90 Q18 72 18 58 L18 26 Z"
        fill="url(#shieldGrad)"
      />
      
      {/* Top banner */}
      <path
        d="M20 20 L80 20 Q78 25 75 28 L25 28 Q22 25 20 20"
        fill="#d4af37"
      />
      
      {/* TEXAS text */}
      <text
        x="50"
        y="24"
        textAnchor="middle"
        fontSize="6"
        fontWeight="bold"
        fill="#1a1a1a"
        fontFamily="serif"
      >
        TEXAS
      </text>
      
      {/* Central Star */}
      <path
        d="M50 35 L53 44 L62 44 L55.5 49.5 L58 58.5 L50 53 L42 58.5 L44.5 49.5 L38 44 L47 44 Z"
        fill="url(#starGrad)"
        stroke="#b8941f"
        strokeWidth="0.5"
      />
      
      {/* Bottom banner */}
      <path
        d="M25 70 L75 70 Q77 75 75 78 L25 78 Q23 75 25 70"
        fill="#d4af37"
      />
      
      {/* COUNTIES DIVISION PATROL text */}
      <text
        x="50"
        y="74"
        textAnchor="middle"
        fontSize="4"
        fontWeight="bold"
        fill="#1a1a1a"
        fontFamily="serif"
      >
        COUNTIES DIVISION
      </text>
      
      <text
        x="50"
        y="82"
        textAnchor="middle"
        fontSize="4"
        fontWeight="bold"
        fill="#1a1a1a"
        fontFamily="serif"
      >
        PATROL
      </text>
      
      {/* Decorative wheat elements */}
      <path
        d="M25 50 Q23 48 25 46 Q27 48 25 50 M27 52 Q25 50 27 48 Q29 50 27 52"
        fill="#d4af37"
        strokeWidth="0.5"
        stroke="#b8941f"
      />
      
      <path
        d="M75 50 Q77 48 75 46 Q73 48 75 50 M73 52 Q75 50 73 48 Q71 50 73 52"
        fill="#d4af37"
        strokeWidth="0.5"
        stroke="#b8941f"
      />
    </svg>
  );
};
