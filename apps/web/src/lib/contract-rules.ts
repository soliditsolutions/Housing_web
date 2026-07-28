/**
 * Motor de reglas determinístico para validación de contrato de arriendo (ADR-0012).
 *
 * Reemplaza la llamada a IA para los datos ESTRUCTURADOS del contrato: casi todo el
 * checklist legal (garantía, mora, plazo, multa, día, RUTs, coherencia) son reglas
 * numéricas sobre datos que ya están en la BD — no necesitan un LLM. Este motor es
 * el **baseline siempre-on y local**: corre sin consentimiento y sin enviar nada
 * afuera. La IA externa (opt-in) solo agrega la prosa asesora sobre el texto de las
 * cláusulas de un documento subido.
 *
 * Produce exactamente el mismo `ValidacionResultado` que consumía la UI desde la IA,
 * así que la renderiza igual. Explicable y auditable: cada alerta dice qué regla se
 * gatilló y qué dice la ley.
 *
 * Fuentes: Ley 18.101 (art. 46 garantía), interés máximo convencional (mora),
 * prácticas de mercado 2026.
 */
import { validateRut } from "./rut";
import type { ValidacionResultado, ValidacionEstado } from "@/app/api/contratos/[id]/validar/route";

/** Solo los campos que las reglas necesitan (sin nombres ni direcciones: no hacen falta). */
export interface DatosContratoReglas {
  propietarioRut:   string | null;
  arrendatarioRut:  string | null;
  valorArriendo:    number;
  denominacion:     string;
  diaVencimiento:   number;
  garantiaMeses:    number;
  garantiaMontoCLP: number;
  multaMeses:       number;
  moraTasaPct:      number;
  moraDiasGracia:   number;
  fechaInicio:      Date;
  fechaFin:         Date | null;
}

export function evaluarReglasContrato(d: DatosContratoReglas): ValidacionResultado {
  const estructura:      string[] = [];
  const cumplimiento:    string[] = [];
  const montos:          string[] = [];
  const partes:          string[] = [];
  const criticas:        string[] = [];
  const recomendaciones: string[] = [];

  // ── Información de las partes: RUTs presentes y válidos (mod-11) ──────────────
  for (const [rol, rut] of [["arrendador", d.propietarioRut], ["arrendatario", d.arrendatarioRut]] as const) {
    if (!rut || rut.trim() === "") {
      const msg = `Falta el RUT del ${rol}: sin él, el contrato no tiene validez jurídica plena.`;
      partes.push(msg); criticas.push(msg);
    } else if (!validateRut(rut)) {
      const msg = `El RUT del ${rol} no supera la validación de dígito verificador — conviene revisarlo.`;
      partes.push(msg); criticas.push(msg);
    }
  }

  // ── Garantía: máximo 2 meses (art. 46 Ley 18.101) ────────────────────────────
  if (d.garantiaMeses > 2) {
    const msg = `La garantía pactada (${d.garantiaMeses} meses) supera el máximo legal de 2 meses de renta (art. 46, Ley 18.101).`;
    cumplimiento.push(msg); criticas.push(msg);
  } else if (d.garantiaMeses <= 0 && d.garantiaMontoCLP <= 0) {
    recomendaciones.push("No se pactó garantía: el arrendador queda sin respaldo ante daños o incumplimientos. Podés incluir hasta 2 meses.");
  }

  // ── Mora: tasa máxima ~1.5% mensual; días de gracia habitual 5–10 ────────────
  if (d.moraTasaPct > 1.5) {
    const msg = `La tasa de mora (${d.moraTasaPct}% mensual) supera el máximo convencional (~1.5% mensual) y podría considerarse usura.`;
    cumplimiento.push(msg); criticas.push(msg);
  }
  if (d.moraDiasGracia < 5 || d.moraDiasGracia > 10) {
    recomendaciones.push(`Los días de gracia de mora (${d.moraDiasGracia}) están fuera del rango habitual de 5 a 10 días.`);
  }

  // ── Plazo (estructura) + coherencia de fechas ────────────────────────────────
  if (!d.fechaFin) {
    recomendaciones.push("El plazo es indefinido: un plazo fijo de 12 meses da más certeza a ambas partes.");
  } else if (d.fechaFin.getTime() <= d.fechaInicio.getTime()) {
    const msg = "La fecha de término es anterior o igual a la de inicio: revisá la vigencia del contrato.";
    estructura.push(msg); criticas.push(msg);
  }

  // ── Día de vencimiento: rango 1–28 ───────────────────────────────────────────
  if (d.diaVencimiento < 1 || d.diaVencimiento > 28) {
    estructura.push(`El día de vencimiento (${d.diaVencimiento}) está fuera del rango 1–28, lo que genera problemas en meses cortos como febrero.`);
  }

  // ── Multa por término anticipado: habitual 1–3 meses ─────────────────────────
  if (d.multaMeses <= 0) {
    recomendaciones.push("No se pactó multa por término anticipado: el arrendador queda sin cobertura si el arrendatario se retira antes.");
  } else if (d.multaMeses > 3) {
    montos.push(`La multa por término anticipado (${d.multaMeses} meses) está por sobre lo habitual (1 a 3 meses).`);
  }

  // ── Renta (montos, coherencia) ───────────────────────────────────────────────
  if (!(d.valorArriendo > 0)) {
    const msg = "La renta mensual es cero o inválida: revisá el monto del arriendo.";
    montos.push(msg); criticas.push(msg);
  }

  const categorias = {
    estructura:         { ok: estructura.length === 0,   alertas: estructura },
    cumplimiento_legal: { ok: cumplimiento.length === 0, alertas: cumplimiento },
    montos:             { ok: montos.length === 0,       alertas: montos },
    informacion_partes: { ok: partes.length === 0,       alertas: partes },
  };

  const totalAlertas = estructura.length + cumplimiento.length + montos.length + partes.length;
  const estado: ValidacionEstado =
    criticas.length > 0                                 ? "requiere_revision"
    : totalAlertas > 0 || recomendaciones.length > 0    ? "con_alertas"
    :                                                     "aprobado";

  const resumen =
    estado === "aprobado"
      ? "El contrato cumple las verificaciones automáticas de estructura, montos y datos de las partes. Puede firmarse con confianza."
    : estado === "con_alertas"
      ? `Se encontraron ${totalAlertas} observación(es) y ${recomendaciones.length} sugerencia(s). El contrato es válido; revisá los puntos señalados para robustecerlo.`
      : `Hay ${criticas.length} punto(s) con impacto legal que conviene revisar antes de firmar. Podés proceder igualmente bajo tu criterio.`;

  return { estado, resumen, categorias, alertas_criticas: criticas, recomendaciones };
}
