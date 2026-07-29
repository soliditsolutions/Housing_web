export type PlanId = "bronze" | "silver" | "gold" | "diamond";

export type PlanFeature = {
  /** Línea corta que se muestra en la card (una feature = una línea). */
  text: string;
  /** Explicación de la jerga ("slots", "tokens") — se muestra como tooltip
   * junto a la feature, en vez de alargar la línea con paréntesis. */
  tooltip?: string;
};

export type Plan = {
  id: PlanId;
  name: string;
  /** Subtítulo de la card: a quién está dirigido el plan. */
  tagline: string;
  monthly: number;
  annual: number;
  /** Etiqueta de ahorro que aparece al facturar anual. */
  annualSavings: string;
  features: PlanFeature[];
  /**
   * Cupo de usuarios del tenant (Manager incluido). Única fuente para el
   * enforcement real de ADR-0013 Fase E (`getCupoUsuarios()` más abajo) y
   * para la línea "Acceso/Multicuenta" de la card — cambiar este número
   * basta para actualizar ambos a la vez, no hay que tocar el texto aparte.
   */
  maxUsuarios: number;
  /** Plan destacado visualmente ("Más popular"). */
  featured?: boolean;
};

const TOOLTIP_SLOTS =
  "Espacios para propiedades en arriendo — cuentan las disponibles, las arrendadas y las en pausa.";
const TOOLTIP_TOKENS =
  "Cada token equivale a una revisión de contrato con IA. El cupo se renueva todos los días.";

function usuariosFeatureText(maxUsuarios: number): string {
  return maxUsuarios === 1
    ? "Acceso para 1 usuario"
    : `Multicuenta: hasta ${maxUsuarios} usuarios`;
}

/** Única fuente de los 4 planes — la usa la parada "Nuestros Planes" del
 * escenario walkthrough (ver PlanesStop.tsx). */
export const PLANS: Plan[] = [
  {
    id: "bronze",
    name: "Bronze",
    tagline:
      "Ideal para corredores independientes que están dando sus primeros pasos en el rubro de los arriendos.",
    monthly: 5,
    annual: 50,
    annualSavings: "Ahorras 2 meses",
    features: [
      { text: "7 slots para propiedades", tooltip: TOOLTIP_SLOTS },
      { text: "3 tokens diarios de IA", tooltip: TOOLTIP_TOKENS },
      { text: "Analítica básica de cartera" },
      { text: usuariosFeatureText(1) },
      { text: "Soporte técnico estándar" },
    ],
    maxUsuarios: 1,
  },
  {
    id: "silver",
    name: "Silver",
    tagline:
      "Diseñado para corredores en crecimiento con una cartera de clientes establecida.",
    monthly: 12,
    annual: 120,
    annualSavings: "Ahorras USD $24",
    features: [
      { text: "20 slots para propiedades", tooltip: TOOLTIP_SLOTS },
      { text: "7 tokens diarios de IA", tooltip: TOOLTIP_TOKENS },
      { text: "Analítica intermedia de desempeño" },
      { text: usuariosFeatureText(2) },
      { text: "Soporte técnico estándar" },
    ],
    maxUsuarios: 2,
  },
  {
    id: "gold",
    name: "Gold",
    tagline:
      "Pensado para corredores experimentados y agencias pequeñas con alto volumen.",
    monthly: 25,
    annual: 250,
    annualSavings: "Ahorras USD $50",
    features: [
      { text: "50 slots para propiedades", tooltip: TOOLTIP_SLOTS },
      { text: "25 tokens diarios de IA", tooltip: TOOLTIP_TOKENS },
      { text: "Analítica avanzada de portafolio" },
      { text: usuariosFeatureText(5) },
      { text: "Soporte técnico estándar" },
    ],
    maxUsuarios: 5,
    featured: true,
  },
  {
    id: "diamond",
    name: "Diamond",
    tagline:
      "Exclusivo para agencias consolidadas y grandes portafolios de administración.",
    monthly: 50,
    annual: 500,
    annualSavings: "Ahorras USD $100",
    features: [
      { text: "200 slots para propiedades", tooltip: TOOLTIP_SLOTS },
      { text: "Tokens de IA ilimitados", tooltip: TOOLTIP_TOKENS },
      { text: "Analítica premium + exportación" },
      { text: usuariosFeatureText(10) },
      { text: "Soporte técnico estándar" },
    ],
    maxUsuarios: 10,
  },
];

const CUPO_USUARIOS_POR_PLAN: Record<PlanId, number> = Object.fromEntries(
  PLANS.map((p) => [p.id, p.maxUsuarios]),
) as Record<PlanId, number>;

/**
 * Cupo de usuarios (Manager + Colaboradores activos + invitaciones
 * pendientes) permitido por el plan del tenant — ADR-0013 Fase E.
 *
 * `Tenant.plan` es un string libre sin respaldo de billing todavía (todo
 * signup nuevo recibe "Gratuito" — ver registro/actions.ts), mismo criterio
 * de fallback que `getAnalyticsTier()` en plan-tier.ts: cualquier valor que
 * no calce con un PlanId conocido cae en el cupo de Bronze (el más bajo),
 * nunca en "sin límite".
 */
export function getCupoUsuarios(plan: string | null): number {
  return CUPO_USUARIOS_POR_PLAN[plan as PlanId] ?? CUPO_USUARIOS_POR_PLAN.bronze;
}
