/**
 * Tokens de un solo uso para recuperación de contraseña.
 * CSPRNG 256 bits (Web Crypto API) + hash SHA-256 para persistencia en DB.
 * El token raw viaja en la URL; en DB se guarda solo el hash (defensa en profundidad).
 */

/** Genera un token con 256 bits de entropía real (CSPRNG). */
export function generateResetToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64url");
}

/** SHA-256 del token — valor que se persiste en la base de datos. */
export async function hashToken(token: string): Promise<string> {
  const data   = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
