import { redondearPeso, type CLP } from "./dinero";

/**
 * Cierre de liquidación — Paso 2 del flujo (ADR-0008, Regla 11/12).
 *
 * Dado un período ya conciliado (paso 1 hecho), calcula la distribución final:
 * comisión del corredor, ajustes (reparaciones, retenciones) y neto al propietario.
 *
 * Tipos de ajuste (ADR-0008, Regla 12):
 *   descuento_propietario → reduce el neto al propietario (ej. reparación de su cargo)
 *   retencion             → el corredor retiene un monto (ej. garantía parcial)
 *   cargo_arrendatario    → aumenta la deuda del arrendatario; NO afecta el neto
 *                           al propietario (se contabiliza aparte como CARGO_AJUSTE)
 */

export type TipoAjusteLiquidacion =
  | "descuento_propietario"
  | "cargo_arrendatario"
  | "retencion";

export interface AjusteInput {
  tipo: TipoAjusteLiquidacion;
  montoCLP: CLP;
}

export interface DatosLiquidacion {
  /** Arriendo del período en CLP (ya convertido de UF si correspondía). */
  arriendoCLP: CLP;
  /** Ajustes que el corredor agregó antes de cerrar (pueden ser 0 o más). */
  ajustes: AjusteInput[];
  /** Porcentaje de comisión del corredor (ej. 8 = 8%). */
  comisionPct: number;
}

export interface ResultadoLiquidacion {
  /** Comisión retenida por el corredor. */
  comisionCLP: CLP;
  /**
   * Suma de ajustes que reducen el neto al propietario
   * (descuento_propietario + retencion).
   */
  descuentoPropietarioCLP: CLP;
  /**
   * Neto que recibe el propietario:
   * arriendoCLP − comisionCLP − descuentoPropietarioCLP
   * Puede ser negativo si los descuentos superan el arriendo; el caller decide cómo manejarlo.
   */
  liquidacionNetaCLP: CLP;
  /**
   * Suma de cargos al arrendatario (cargo_arrendatario).
   * Se registran como CARGO_AJUSTE en el ledger, no afectan el neto al propietario.
   */
  cargoArrendatarioCLP: CLP;
}

/**
 * Calcula la distribución del cierre de liquidación de un período.
 *
 * Fórmula:
 *   comision          = round(arriendoCLP × comisionPct / 100)
 *   descPropietario   = Σ ajustes tipo descuento_propietario + retencion
 *   cargoArrendatario = Σ ajustes tipo cargo_arrendatario
 *   netoPropietario   = arriendoCLP − comision − descPropietario
 */
export function calcularLiquidacion(datos: DatosLiquidacion): ResultadoLiquidacion {
  const { arriendoCLP, ajustes, comisionPct } = datos;

  if (comisionPct < 0 || comisionPct > 100) {
    throw new Error("calcularLiquidacion: comisionPct debe estar entre 0 y 100");
  }
  if (arriendoCLP < 0) {
    throw new Error("calcularLiquidacion: arriendoCLP no puede ser negativo");
  }
  for (const a of ajustes) {
    if (a.montoCLP < 0) throw new Error("calcularLiquidacion: monto de ajuste inválido");
  }

  const descuentoPropietarioCLP = ajustes
    .filter((a) => a.tipo === "descuento_propietario" || a.tipo === "retencion")
    .reduce((sum, a) => sum + a.montoCLP, 0);

  const cargoArrendatarioCLP = ajustes
    .filter((a) => a.tipo === "cargo_arrendatario")
    .reduce((sum, a) => sum + a.montoCLP, 0);

  const comisionCLP = redondearPeso((arriendoCLP * comisionPct) / 100);

  const liquidacionNetaCLP =
    arriendoCLP - comisionCLP - descuentoPropietarioCLP;

  return {
    comisionCLP,
    descuentoPropietarioCLP,
    liquidacionNetaCLP,
    cargoArrendatarioCLP,
  };
}
