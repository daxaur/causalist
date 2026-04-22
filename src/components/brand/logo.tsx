interface LogoProps {
  size?: number;
  className?: string;
  "aria-label"?: string;
}

export function Logo({
  size = 20,
  className,
  "aria-label": ariaLabel = "Causalist",
}: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      role="img"
      aria-label={ariaLabel}
      className={className}
    >
      <path d="M18 5.2 A 8.5 8.5 0 1 0 18 18.8" />
      <circle cx="18" cy="18.8" r="1.9" fill="currentColor" stroke="none" />
      <circle cx="18" cy="5.2" r="1.9" />
    </svg>
  );
}

export function LogoWordmark({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Logo size={size} />
      <span className="font-display text-[1.05em] font-medium tracking-tight">
        causalist
      </span>
    </span>
  );
}
