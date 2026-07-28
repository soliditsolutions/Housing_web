/**
 * Wordmark "Housing SOLIDIT" del sitio público (tema pf).
 * Renderiza los dos <span> (sin envoltorio) para que el llamador controle el
 * enlace/gap. Colores parametrizables por si se usa sobre fondos distintos.
 */
interface LogoProps {
  size?:         "xs" | "sm" | "md" | "lg";
  housingColor?: string;
  soliditColor?: string;
}

const SIZE = {
  xs: { h: "text-xs",   s: "text-[9px]"  },
  sm: { h: "text-base", s: "text-[9px]"  },
  md: { h: "text-xl",   s: "text-[10px]" },
  lg: { h: "text-2xl",  s: "text-[10px]" },
} as const;

export function Logo({
  size = "sm",
  housingColor = "var(--pf-navy)",
  soliditColor = "var(--pf-text-light)",
}: LogoProps) {
  const sz = SIZE[size];
  return (
    <>
      <span className={`${sz.h} font-bold tracking-tight`} style={{ color: housingColor }}>Housing</span>
      <span className={`${sz.s} font-semibold uppercase tracking-widest`} style={{ color: soliditColor }}>SOLIDIT</span>
    </>
  );
}
