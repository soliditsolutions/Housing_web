/**
 * Logger centralizado resistente a filtración de PII.
 *
 * En desarrollo: reenvía a console.error con el error completo (stack incluido).
 * En producción: registra solo el tipo de error y los primeros 200 caracteres
 * del mensaje, sin stack trace ni cause — evita exponer rutas internas,
 * valores de campos de BD o datos de usuario en logs de la plataforma.
 *
 * SEC: OWASP A09:2021 – Security Logging and Monitoring Failures
 * SEC: Ley 21.719 — minimización de datos en trazas de sistema
 */

export function logError(tag: string, err: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[${tag}]`, err);
    return;
  }
  const name = err instanceof Error ? err.name  : "Error";
  const msg  = err instanceof Error
    ? err.message.slice(0, 200)
    : String(err).slice(0, 200);
  console.error(`[${tag}] ${name}: ${msg}`);
}
