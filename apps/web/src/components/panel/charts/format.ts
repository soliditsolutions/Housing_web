/**
 * Formateadores para ejes/tooltips de los gráficos del módulo de
 * estadísticas. Viven acá (no se pasan como prop función) porque las
 * páginas que arman estos gráficos son Server Components — una función no
 * puede cruzar la frontera Server→Client como prop en React Server
 * Components, así que cada chart resuelve su propio formato a partir de un
 * string literal ("clp" | "pct" | "dias").
 */
export type ChartFormat = "clp" | "clpCompact" | "pct" | "dias";

export function formatChartValue(v: number, format: ChartFormat): string {
  switch (format) {
    case "clp":
      return `$${Math.round(v).toLocaleString("es-CL")}`;
    case "clpCompact":
      if (Math.abs(v) >= 1_000_000) return `$${Math.round(v / 1_000_000)}M`;
      if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`;
      return `$${Math.round(v)}`;
    case "pct":
      return `${v}%`;
    case "dias":
      return `${v}d`;
  }
}
