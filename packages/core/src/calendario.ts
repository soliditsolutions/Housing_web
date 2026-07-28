import type { Denominacion } from "./dinero";

/**
 * Generación del calendario de pagos de un contrato (Regla 3 del dominio).
 *
 * - Un período por mes calendario, entre el mes de inicio y el mes de fin (inclusive).
 * - Mes completo: NO se prorratea por días.
 * - El día de vencimiento es configurable; si el mes no tiene ese día (ej. 31 en
 *   febrero), se ajusta al último día del mes.
 */

export interface TerminosCalendario {
  /** Fecha de inicio del contrato. */
  fechaInicio: Date;
  /** Fecha de fin del contrato (inclusive a nivel de mes). */
  fechaFin: Date;
  /** Día del mes en que vence el pago (1–31). */
  diaVencimiento: number;
  /** Monto del arriendo en la moneda del contrato (UF o CLP). */
  montoArriendo: number;
  /** Denominación del contrato (informativa para el período). */
  denominacion: Denominacion;
  /** Gasto común del período en CLP (0 si no aplica). */
  montoGastoComun?: number;
}

export interface PeriodoCalendario {
  numero: number;
  fechaInicio: Date;
  fechaVencimiento: Date;
  /** Arriendo del período, en la moneda del contrato. */
  montoBase: number;
  /** Gasto común del período, en CLP. */
  montoGastoComun: number;
}

function ultimoDiaMes(anio: number, mes0: number): number {
  return new Date(Date.UTC(anio, mes0 + 1, 0)).getUTCDate();
}

function fechaUTC(anio: number, mes0: number, dia: number): Date {
  return new Date(Date.UTC(anio, mes0, dia));
}

export function generarCalendario(t: TerminosCalendario): PeriodoCalendario[] {
  if (t.diaVencimiento < 1 || t.diaVencimiento > 31) {
    throw new Error("generarCalendario: diaVencimiento fuera de rango (1–31)");
  }
  if (t.fechaFin < t.fechaInicio) {
    throw new Error("generarCalendario: fechaFin anterior a fechaInicio");
  }

  const periodos: PeriodoCalendario[] = [];
  let anio = t.fechaInicio.getUTCFullYear();
  let mes = t.fechaInicio.getUTCMonth();
  const finAnio = t.fechaFin.getUTCFullYear();
  const finMes = t.fechaFin.getUTCMonth();
  let numero = 1;

  while (anio < finAnio || (anio === finAnio && mes <= finMes)) {
    const diaV = Math.min(t.diaVencimiento, ultimoDiaMes(anio, mes));
    periodos.push({
      numero,
      fechaInicio: fechaUTC(anio, mes, 1),
      fechaVencimiento: fechaUTC(anio, mes, diaV),
      montoBase: t.montoArriendo,
      montoGastoComun: t.montoGastoComun ?? 0,
    });
    numero++;
    mes++;
    if (mes > 11) {
      mes = 0;
      anio++;
    }
  }

  return periodos;
}

/**
 * Indica si un período corresponde al aniversario del contrato o posterior
 * (para aplicar el reajuste de IPC en contratos en CLP — Regla 2).
 * El aniversario ocurre cada `mesesCiclo` (default 12) desde el inicio.
 */
export function esPeriodoDeReajuste(
  numeroPeriodo: number,
  mesesCiclo = 12,
): boolean {
  return numeroPeriodo > mesesCiclo && (numeroPeriodo - 1) % mesesCiclo === 0;
}
