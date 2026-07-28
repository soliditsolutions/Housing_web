import { redondearPeso, type CLP } from "./dinero";

/**
 * Gestión de la garantía / depósito (ADR-0009, Regla 14).
 *
 * La garantía es un depósito passthrough: no es ingreso del propietario
 * ni deuda recurrente del arrendatario. Se retiene al inicio y se
 * devuelve (íntegra o parcialmente) al término del contrato.
 *
 * Ley chilena: máximo 2 rentas (Ley 18.101 art. 19).
 */

export interface DatosGarantia {
  /** Monto efectivamente recibido como depósito (CLP). */
  montoDepositoCLP: CLP;
  /** Monto a retener por daños u otros conceptos (CLP, ≥ 0). */
  montoRetencionCLP?: CLP;
}

export interface ResultadoTerminoGarantia {
  /** Monto que se retiene (por daños, etc.). */
  retenidoCLP: CLP;
  /** Monto a devolver al arrendatario. */
  devueltoCLP: CLP;
}

/** Máximo legal de meses de garantía en Chile (Ley 18.101). */
export const MAX_MESES_GARANTIA = 2;

/**
 * Valida que el monto de garantía no supere el máximo legal.
 * @param montoGarantia Monto propuesto.
 * @param valorArriendo Renta mensual (en la misma denominación).
 * @returns true si es válido.
 */
export function esGarantiaValida(
  montoGarantia: number,
  valorArriendo: number,
): boolean {
  if (valorArriendo <= 0) return false;
  return montoGarantia <= valorArriendo * MAX_MESES_GARANTIA;
}

/**
 * Calcula cuánto se retiene y cuánto se devuelve al término del contrato.
 *
 * Si la retención supera el depósito, la retención se topa al depósito
 * (no se puede retener más de lo que se recibió).
 */
export function calcularTerminoGarantia(
  datos: DatosGarantia,
): ResultadoTerminoGarantia {
  const { montoDepositoCLP, montoRetencionCLP = 0 } = datos;

  if (montoDepositoCLP < 0) {
    throw new Error("calcularTerminoGarantia: monto de depósito inválido");
  }
  if (montoRetencionCLP < 0) {
    throw new Error("calcularTerminoGarantia: monto de retención inválido");
  }

  const retenidoCLP = Math.min(
    redondearPeso(montoRetencionCLP),
    montoDepositoCLP,
  );
  const devueltoCLP = montoDepositoCLP - retenidoCLP;

  return { retenidoCLP, devueltoCLP };
}
