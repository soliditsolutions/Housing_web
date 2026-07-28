/**
 * Validación y formateo de RUT chileno (algoritmo mod-11).
 * Sin dependencias externas — funciona en browser y Node.
 *
 * Referencias: SII Chile, Ley N° 19.477.
 */

/** Elimina puntos, guiones y espacios; pasa el DV a mayúscula. */
function limpiar(rut: string): string {
  return rut.replace(/[.\-\s]/g, "").toUpperCase();
}

/**
 * Calcula el dígito verificador esperado para un cuerpo numérico.
 * @param cuerpo String numérico sin DV (ej: "12345678").
 * @returns DV como string: "0"–"9" ó "K".
 */
function calcularDV(cuerpo: string): string {
  let n   = parseInt(cuerpo, 10);
  let sum = 0;
  let mul = 2;
  while (n > 0) {
    sum += (n % 10) * mul;
    n    = Math.floor(n / 10);
    mul  = mul === 7 ? 2 : mul + 1;
  }
  const result = 11 - (sum % 11);
  if (result === 11) return "0";
  if (result === 10) return "K";
  return String(result);
}

/**
 * Valida un RUT chileno verificando el dígito verificador (mod-11).
 * Acepta formatos libres: "12.345.678-9", "12345678-9", "12345678-K", etc.
 *
 * @example
 * validarRut("12.345.678-9") // true o false según DV real
 * validarRut("1-9")          // true (RUT de empresa de test)
 * validarRut("0-0")          // false (cuerpo 0 inválido)
 */
export function validarRut(rut: string): boolean {
  if (!rut || typeof rut !== "string") return false;
  const limpio = limpiar(rut.trim());
  if (limpio.length < 2) return false;
  const dv     = limpio.slice(-1);
  const cuerpo = limpio.slice(0, -1);
  if (!/^\d+$/.test(cuerpo)) return false;
  if (parseInt(cuerpo, 10) < 1) return false;          // cuerpo 0 inválido
  return dv === calcularDV(cuerpo);
}

/**
 * Formatea un RUT al estilo estándar chileno: XX.XXX.XXX-Y.
 * Si el RUT está incompleto o mal formado, devuelve el string sin cambios.
 * Nunca lanza excepciones.
 *
 * @example
 * formatearRut("123456789")   → "12.345.678-9"
 * formatearRut("12345678-9")  → "12.345.678-9"
 * formatearRut("abc")         → "abc"
 */
export function formatearRut(rut: string): string {
  if (!rut || typeof rut !== "string") return rut ?? "";
  const limpio = limpiar(rut.trim());
  if (limpio.length < 2) return rut;
  const dv     = limpio.slice(-1);
  const cuerpo = limpio.slice(0, -1);
  if (!/^\d+$/.test(cuerpo)) return rut;
  const cuerpoFmt = parseInt(cuerpo, 10)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoFmt}-${dv}`;
}
