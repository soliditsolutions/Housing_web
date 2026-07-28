/**
 * Resolución de IP del cliente — centralizada y resistente a spoofing.
 *
 * SEGURIDAD:
 * - En Vercel/Cloudflare el header `x-real-ip` lo inyecta el edge y no
 *   puede ser manipulado por el cliente — es el origen más confiable.
 * - `x-forwarded-for` puede ser forjado si no hay proxy de confianza;
 *   tomamos el ÚLTIMO hop (el que agrega el proxy real) en lugar del
 *   primero, que puede ser un valor inyectado por el atacante.
 * - En desarrollo sin proxy, devolvemos "127.0.0.1" como fallback.
 *
 * Ref: OWASP A05:2021 – Security Misconfiguration (CWE-441)
 */
import type { NextRequest } from "next/server";
import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";

/**
 * Extrae la IP real del cliente desde un `NextRequest` (API Routes / Middleware).
 * Prioridad: x-real-ip → último hop de x-forwarded-for → "127.0.0.1"
 */
export function getClientIp(req: NextRequest): string {
  return resolveIp(req.headers);
}

/**
 * Extrae la IP real del cliente desde `headers()` de Next.js
 * (Server Actions / Server Components).
 */
export function getClientIpFromHeaders(headers: ReadonlyHeaders): string {
  return resolveIp(headers);
}

function resolveIp(headers: { get(name: string): string | null }): string {
  // 1. x-real-ip: inyectado por el proxy de borde — no manipulable por el cliente
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // 2. x-forwarded-for: tomamos el último valor (agrega el proxy más cercano).
  //    El primer valor puede haber sido insertado por el cliente → no confiable.
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    const last = ips.at(-1);
    if (last) return last;
  }

  return "127.0.0.1";
}
