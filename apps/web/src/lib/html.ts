/**
 * Utilidades de escape HTML para generación segura de documentos.
 *
 * SEGURIDAD (CWE-79 — Cross-site Scripting / Stored XSS):
 * Datos provenientes de la BD (nombres, RUTs, direcciones) deben escaparse
 * antes de interpolarse en HTML. Una cadena como `<script>…</script>` en el
 * nombre de un arrendatario quedaría embebida en el documento generado.
 *
 * Esta función escapa los 5 caracteres especiales de HTML — suficiente para
 * prevenir inyección en contextos de texto y atributos con comillas.
 */

/**
 * Escapa caracteres especiales HTML en una cadena arbitraria.
 * Retorna una cadena segura para interpolar como texto en HTML.
 *
 * @example
 *   esc('<script>alert(1)</script>')
 *   // → '&lt;script&gt;alert(1)&lt;/script&gt;'
 */
export function esc(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
    .replace(/'/g,  "&#x27;");
}
