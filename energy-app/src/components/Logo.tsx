// Marque : un boîtier de compteur (le badge arrondi) avec un arc de
// cadran (l'aiguille de relevé) et un éclair (l'énergie/l'alerte) —
// reflète les deux piliers de l'app : relevés manuels + alertes tarif.

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#logo-gradient)" />
      <path
        d="M20 6a14 14 0 0 1 12.12 21"
        stroke="white"
        strokeOpacity="0.35"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M21 10 12 22h6l-1 8 9-12h-6l1-8z"
        fill="white"
      />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  className?: string;
  wordmarkClassName?: string;
}

export function Logo({ size = 30, className, wordmarkClassName }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={size} />
      <span
        className={`font-semibold tracking-tight ${wordmarkClassName ?? ""}`}
      >
        <span>Volt</span>
        <span className="text-spark-500">Watch</span>
      </span>
    </span>
  );
}
