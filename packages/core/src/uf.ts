import { redondearPeso, type CLP } from "./dinero";

/**
 * Conversión de UF a CLP.
 *
 * Regla 1 del dominio: una renta en UF flota a diario; se convierte a CLP con el
 * valor de la UF a la fecha del evento (vencimiento/pago). NO se reajusta por IPC.
 *
 * @param valorEnUf  Monto expresado en UF (admite decimales).
 * @param valorUfDelDia  Valor de 1 UF en CLP a la fecha del evento.
 * @returns Monto en CLP redondeado al peso.
 */
export function convertirUfAClp(valorEnUf: number, valorUfDelDia: number): CLP {
  if (valorEnUf < 0 || valorUfDelDia <= 0) {
    throw new Error("convertirUfAClp: valores inválidos");
  }
  return redondearPeso(valorEnUf * valorUfDelDia);
}
