/**
 * Gestión de sesión JWT para el Portal de Autoconsulta (ADR-0007).
 * Sesión de solo lectura, 30 minutos, separada del sistema de panel.
 * Cookie: __Host-hw_portal (prod) / hw_portal (dev).
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

export type PortalPayload = JWTPayload & {
  personaId:   string;
  propiedadId: string;
  tenantId:    string;
  rol:         "arrendatario" | "propietario";
};

const IS_PROD = process.env.NODE_ENV === "production";
export const PORTAL_COOKIE_NAME = IS_PROD ? "__Host-hw_portal" : "hw_portal";
const PORTAL_TTL = 30 * 60; // 30 minutos en segundos

function getPortalSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 32) throw new Error("AUTH_SECRET demasiado corto");
  // Prefix "portal:" separa este dominio del JWT de panel — misma clave, distinto ámbito
  return new TextEncoder().encode("portal:" + raw);
}

export async function signPortalSession(
  payload: Omit<PortalPayload, "iat" | "exp">,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PORTAL_TTL}s`)
    .sign(getPortalSecret());
}

export async function verifyPortalToken(token: string): Promise<PortalPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getPortalSecret());
    return payload as PortalPayload;
  } catch {
    return null;
  }
}

export async function getPortalSession(): Promise<PortalPayload | null> {
  const jar   = await cookies();
  const token = jar.get(PORTAL_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyPortalToken(token);
}

export async function setPortalCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(PORTAL_COOKIE_NAME, token, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "strict",
    path:     "/portal",
    maxAge:   PORTAL_TTL,
  });
}

export async function clearPortalCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(PORTAL_COOKIE_NAME, "", {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "strict",
    path:     "/portal",
    maxAge:   0,
  });
}
