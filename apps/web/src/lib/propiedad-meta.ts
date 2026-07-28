import { Home, Building2, Tent } from "lucide-react";

/**
 * Metadatos de presentación por tipo de propiedad (etiqueta + icono).
 * Fuente única usada por el marketplace (listado y ficha).
 */
export const TIPO_META: Record<string, { label: string; icon: typeof Home }> = {
  casa:         { label: "Casa",         icon: Home      },
  departamento: { label: "Departamento", icon: Building2 },
  cabana:       { label: "Cabaña",       icon: Tent      },
};

/** Devuelve el meta del tipo indicado, con fallback a "casa". */
export function tipoMeta(tipo: string): { label: string; icon: typeof Home } {
  return TIPO_META[tipo] ?? TIPO_META.casa;
}
