import { redondearPeso, type CLP } from "./dinero";

/**
 * Reajuste por IPC (Regla 2 del dominio).
 *
 * Aplica SOLO a contratos en CLP, en el aniversario de CADA contrato.
 * El IPC se almacena como índice base 100 (ver docs/04-esquema-bd.md), por lo que la
 * variación acumulada entre dos meses = indiceFinal / indiceInicial - 1.
 */

/** Variación acumulada del IPC entre dos índices (ej. 0.042 = 4,2%). */
export function variacionIpc(indiceInicial: number, indiceFinal: number): number {
  if (indiceInicial <= 0 || indiceFinal <= 0) {
    throw new Error("variacionIpc: índices inválidos");
  }
  return indiceFinal / indiceInicial - 1;
}

/**
 * Reajusta un monto en CLP por la variación de IPC entre dos índices.
 * @returns Nuevo monto en CLP redondeado al peso.
 */
export function aplicarReajusteIpc(
  montoClp: CLP,
  indiceInicial: number,
  indiceFinal: number,
): CLP {
  const factor = indiceFinal / indiceInicial;
  if (!(factor > 0)) {
    throw new Error("aplicarReajusteIpc: índices inválidos");
  }
  return redondearPeso(montoClp * factor);
}
