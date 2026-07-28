/**
 * Utilidades de contraseña — PBKDF2-SHA256 vía Web Crypto API.
 * Funciona en Node.js (server actions, seed) y Edge runtime (middleware).
 * Sin dependencias externas.
 */

const ITERATIONS = 310_000; // OWASP 2024 para PBKDF2-SHA256
const HASH_BITS  = 256;
const SEP        = "$";
const VERSION    = "pbkdf2v1";

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt    = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    HASH_BITS,
  );

  const saltB64 = Buffer.from(salt).toString("base64");
  const hashB64 = Buffer.from(bits).toString("base64");
  return `${VERSION}${SEP}${saltB64}${SEP}${hashB64}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split(SEP);
  if (parts.length !== 3 || parts[0] !== VERSION) return false;

  const [, saltB64, hashB64] = parts;
  const salt        = Uint8Array.from(Buffer.from(saltB64, "base64"));
  const storedHash  = Buffer.from(hashB64, "base64");
  const encoder     = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    HASH_BITS,
  );

  const candidate = new Uint8Array(bits);
  if (candidate.length !== storedHash.length) return false;

  // Comparación en tiempo constante (evita timing attacks)
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate[i] ^ storedHash[i];
  }
  return diff === 0;
}
