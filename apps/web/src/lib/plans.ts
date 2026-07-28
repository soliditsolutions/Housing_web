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
  /** Plan destacado visualmente ("Más popular"). */
  featured?: boolean;
};

const TOOLTIP_SLOTS =
  "Espacios para propiedades en arriendo — cuentan las disponibles, las arrendadas y las en pausa.";
const TOOLTIP_TOKENS =
  "Cada token equivale a una revisión de contrato con IA. El cupo se renueva todos los días.";

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
      { text: "Acceso para 1 usuario" },
      { text: "Soporte técnico estándar" },
    ],
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
      { text: "Multicuenta: hasta 2 usuarios" },
      { text: "Soporte técnico estándar" },
    ],
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
      { text: "Multicuenta: hasta 5 usuarios" },
      { text: "Soporte técnico estándar" },
    ],
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
      { text: "Multicuenta: hasta 10 usuarios" },
      { text: "Soporte técnico estándar" },
    ],
  },
];
