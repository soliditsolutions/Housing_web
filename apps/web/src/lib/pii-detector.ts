/**
 * Detector de PII de alta confianza — red técnica del paso "Validación de borrador
 * de contrato" (ADR-0012).
 *
 * El corredor sube un borrador que ATESTA no contener datos personales, bajo su
 * responsabilidad. Pero un disclaimer no sustituye una medida técnica: este
 * detector corre igual como gate FAIL-CLOSED antes de enviar nada a la IA externa.
 * Si encuentra un identificador duro (RUT válido mod-11, email o teléfono), el
 * borrador NO se envía.
 *
 * Diseño (ADR-0012): PRECISIÓN > recall. Nombres y direcciones genéricos quedan
 * bajo responsabilidad del corredor (no hay forma confiable de detectarlos sin
 * ML); acá atrapamos los identificadores de alta confianza. No depende de
 * "valores conocidos" de la BD: un borrador subido no los tiene.
 *
 * NO confundir con la sanitización anti-inyección (control chars / bidi), que es
 * otra preocupación y vive en las rutas de validación (`sanitizarCampo`).
 */
import { validateRut } from "./rut";

export type PiiTipo = "rut" | "email" | "telefono";

export interface PiiHallazgo {
  tipo: PiiTipo;
  cantidad: number;
  /** Muestras SIEMPRE enmascaradas (nunca PII en claro) — para mostrar al corredor o loguear. */
  muestras: string[];
}

export interface PiiResultado {
  /** true si NO se detectó PII de alta confianza. */
  limpio: boolean;
  /** Decisión del gate: fail-closed → "bloquear" ante cualquier hallazgo. */
  decision: "permitir" | "bloquear";
  hallazgos: PiiHallazgo[];
  /** Patrones tipo-RUT que NO validan mod-11: informativo (posible RUT mal escrito), no bloquea. */
  posiblesRut: number;
}

// RUT: requiere separador (punto o guión) para no confundirse con montos.
//  · dotted+dash:  12.345.678-5   |   9.876.543-2
//  · dash sin dots: 12345678-5    |   19341431-1
const RUT_RE = /\b\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b|\b\d{7,8}-[\dkK]\b/g;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w][\w.-]*\b/gi;
// Móvil chileno: 9 + 8 dígitos, con espacios/guiones. NO acepta puntos (esos son de montos).
const PHONE_RE = /(?:\+?56[\s-]?)?9[\s-]?\d{4}[\s-]?\d{4}\b/g;

const unique = (arr: string[]): string[] => [...new Set(arr)];

const maskRut = (r: string): string => {
  const c = r.replace(/[.\-\s]/g, "");
  return `${c.slice(0, 2)}…-${c.slice(-1)}`;
};
const maskEmail = (e: string): string => {
  const [u, d] = e.split("@");
  return `${u.slice(0, 1)}…@${d ?? ""}`;
};
const maskPhone = (p: string): string => `…${p.replace(/\D/g, "").slice(-3)}`;

/**
 * Detecta PII de alta confianza en un texto y decide si el borrador puede enviarse
 * a la IA externa. Fail-closed: cualquier hallazgo → "bloquear".
 */
export function detectarPii(texto: string): PiiResultado {
  // NFKC pliega dígitos/caracteres "fullwidth" (１２３, ＠) a ASCII: sin esto, un
  // RUT/teléfono/email escrito con esos caracteres evadiría los regex basados en \d.
  const src = (typeof texto === "string" ? texto : "").normalize("NFKC");

  // RUT: candidatos por patrón, confirmados por dígito verificador (mod-11).
  const rutCandidatos = unique(src.match(RUT_RE) ?? []);
  const rutValidos = rutCandidatos.filter((r) => validateRut(r));
  const posiblesRut = rutCandidatos.length - rutValidos.length;

  const emails = unique(src.match(EMAIL_RE) ?? []);
  const telefonos = unique(src.match(PHONE_RE) ?? []);

  const hallazgos: PiiHallazgo[] = [];
  if (rutValidos.length)
    hallazgos.push({ tipo: "rut", cantidad: rutValidos.length, muestras: rutValidos.slice(0, 3).map(maskRut) });
  if (emails.length)
    hallazgos.push({ tipo: "email", cantidad: emails.length, muestras: emails.slice(0, 3).map(maskEmail) });
  if (telefonos.length)
    hallazgos.push({ tipo: "telefono", cantidad: telefonos.length, muestras: telefonos.slice(0, 3).map(maskPhone) });

  const limpio = hallazgos.length === 0;
  return { limpio, decision: limpio ? "permitir" : "bloquear", hallazgos, posiblesRut };
}

/**
 * Ayuda opcional: reemplaza la PII de alta confianza por placeholders estructurales
 * ([RUT]/[EMAIL]/[TELEFONO]), conservando el resto del texto para que el análisis
 * de cláusulas siga teniendo sentido. Solo reemplaza RUTs que validan mod-11; los
 * patrones tipo-RUT con DV inválido se dejan intactos (los reporta `detectarPii`
 * como `posiblesRut` para revisión humana). No sustituye al gate: un borrador que
 * pasó por aquí igual debe re-verificarse con `detectarPii` antes de enviar.
 */
export function enmascararPii(texto: string): { texto: string; reemplazos: number } {
  const src = (typeof texto === "string" ? texto : "").normalize("NFKC");
  let reemplazos = 0;
  const out = src
    .replace(EMAIL_RE, () => { reemplazos++; return "[EMAIL]"; })
    .replace(PHONE_RE, () => { reemplazos++; return "[TELEFONO]"; })
    .replace(RUT_RE, (m) => {
      if (!validateRut(m)) return m;
      reemplazos++;
      return "[RUT]";
    });
  return { texto: out, reemplazos };
}
