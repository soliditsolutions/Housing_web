import { redondearPeso, type CLP } from "./dinero";

/**
 * Cálculo de interés por mora (Regla 5 del dominio, ADR-0004).
 *
 * - El interés solo corre si la FECHA REAL del pago supera
 *   `fechaVencimiento + moraDiasGracia`. Esto resuelve el fallo #1 de Leasity:
 *   el corredor puede liquidar tarde declarando la fecha real → cero interés fantasma.
 *
 * - Fórmula: interés simple = arriendoCLP × (tasaMensual / 100 / 30) × diasAtraso
 *   (tasa mensual prorrateada por días corridos, estándar en arriendos chilenos).
 *
 * - Días corridos (no hábiles) en el MVP (ADR-0008, Regla 13).
 */

export interface ResultadoMora {
  /** Días de atraso efectivos (ya descontados los días de gracia). */
  diasAtraso: number;
  /** Interés calculado en CLP (0 si no hay atraso). */
  interesCLP: CLP;
}

/** Diferencia en días calendarios entre dos fechas (negativo si hasta < desde). */
export function diasEntre(desde: Date, hasta: Date): number {
  return Math.floor((hasta.getTime() - desde.getTime()) / 86_400_000);
}

/**
 * Calcula el interés por mora de un período.
 *
 * @param arriendoCLP     Monto de la renta en CLP (ya convertida si era UF).
 * @param fechaVencimiento Fecha en que vencía el pago.
 * @param fechaPagoReal   Fecha en que se recibió efectivamente el pago.
 * @param moraTasaPctMensual  Tasa de interés mensual (ej. 1.5 = 1,5%/mes).
 * @param moraDiasGracia  Días tras el vencimiento sin aplicar interés.
 */
export function calcularMora(
  arriendoCLP: CLP,
  fechaVencimiento: Date,
  fechaPagoReal: Date,
  moraTasaPctMensual: number,
  moraDiasGracia: number,
): ResultadoMora {
  if (moraTasaPctMensual < 0) throw new Error("calcularMora: tasa inválida");
  if (moraDiasGracia < 0) throw new Error("calcularMora: días de gracia inválidos");
  if (arriendoCLP < 0) throw new Error("calcularMora: arriendo inválido");

  const diasDesdeVencimiento = diasEntre(fechaVencimiento, fechaPagoReal);
  const diasAtraso = Math.max(0, diasDesdeVencimiento - moraDiasGracia);

  if (diasAtraso === 0 || moraTasaPctMensual === 0) {
    return { diasAtraso, interesCLP: 0 };
  }

  // Interés simple diario = tasa mensual / 30 días
  const interesCLP = redondearPeso(
    arriendoCLP * (moraTasaPctMensual / 100 / 30) * diasAtraso,
  );

  return { diasAtraso, interesCLP };
}
