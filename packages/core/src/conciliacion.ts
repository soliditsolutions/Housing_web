import type { CLP } from "./dinero";

/**
 * Conciliación de pagos — Paso 1 del flujo de liquidación (ADR-0008, Regla 6).
 *
 * Dado un pago entrante y los montos adeudados del período, determina si el
 * monto coincide exactamente con lo esperado.
 *
 * - CONCILIADO  → el monto calza exacto; se pueden generar los asientos del paso 1.
 * - EN_REVISION → no calza; el corredor debe revisar manualmente.
 *
 * La fecha real del pago la maneja el CALLER (quien llama esta función) para
 * calcular el interés antes de invocar. Esta función solo decide si el monto concilia.
 */

export interface DatosConciliacion {
  /** Monto que declaró haber recibido el corredor (CLP). */
  montoPagadoCLP: CLP;
  /** Arriendo del período en CLP (ya convertido de UF si correspondía). */
  arriendoCLP: CLP;
  /** Gasto común del período en CLP (0 si no aplica). */
  montoGastoComun: CLP;
  /** Interés por mora calculado con calcularMora() (0 si no hay atraso). */
  interesCLP: CLP;
}

export type ResultadoConciliacion =
  | { estado: "conciliado"; totalEsperado: CLP }
  | { estado: "en_revision"; totalEsperado: CLP; diferencia: CLP };

/**
 * Determina si un pago concilia exactamente con lo adeudado del período.
 *
 * totalEsperado = arriendoCLP + montoGastoComun + interesCLP
 *
 * Si el pago es exacto → conciliado.
 * Si hay diferencia (pago parcial, exceso o monto incorrecto) → en_revision.
 */
export function conciliar(datos: DatosConciliacion): ResultadoConciliacion {
  const { montoPagadoCLP, arriendoCLP, montoGastoComun, interesCLP } = datos;

  if (arriendoCLP < 0 || montoGastoComun < 0 || interesCLP < 0) {
    throw new Error("conciliar: montos no pueden ser negativos");
  }

  const totalEsperado: CLP = arriendoCLP + montoGastoComun + interesCLP;

  if (montoPagadoCLP === totalEsperado) {
    return { estado: "conciliado", totalEsperado };
  }

  return {
    estado: "en_revision",
    totalEsperado,
    diferencia: montoPagadoCLP - totalEsperado, // negativo = pago de menos
  };
}
