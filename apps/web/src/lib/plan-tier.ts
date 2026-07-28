import type { PlanId } from "./plans";

export type AnalyticsTier = "basica" | "media" | "avanzada";

const TIER_BY_PLAN: Record<PlanId, AnalyticsTier> = {
  bronze: "basica",
  silver: "media",
  gold: "avanzada",
  diamond: "avanzada",
};

/**
 * `Tenant.plan` es un string libre sin respaldo de billing todavía (todo
 * signup nuevo recibe "Gratuito" — ver registro/actions.ts). Mientras no
 * exista un flujo de cobro/upgrade real, cualquier valor que no calce con
 * un PlanId conocido (incluido "Gratuito") cae en el tier más bajo.
 */
export function getAnalyticsTier(plan: string | null): AnalyticsTier {
  return TIER_BY_PLAN[plan as PlanId] ?? "basica";
}

export const TIER_ORDER: AnalyticsTier[] = ["basica", "media", "avanzada"];

export function tierIndex(tier: AnalyticsTier): number {
  return TIER_ORDER.indexOf(tier);
}

export const TIER_LABEL: Record<AnalyticsTier, string> = {
  basica: "Básica",
  media: "Media",
  avanzada: "Avanzada",
};

/** Plan mínimo (nombre de marketing) que desbloquea cada tier — para los upsells. */
export const TIER_MIN_PLAN_LABEL: Record<AnalyticsTier, string> = {
  basica: "Bronze",
  media: "Silver",
  avanzada: "Gold",
};
