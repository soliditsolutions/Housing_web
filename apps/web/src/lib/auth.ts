/**
 * Gestión de sesión JWT — firmado con HS256 vía jose.
 * Cookie: __Host-hw_session (prod) / hw_session (dev).
 * Duración: 8 horas con refresh pasivo en cada request.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

export type SessionPayload = JWTPayload & {
  sub:            string; // usuarioId
  tenantId:       string;
  rol:            "manager" | "colaborador";
  nombre:         string;
  email:          string;
  perfilCompleto: boolean;
  deviceToken?:   string; // UUID del dispositivo confiable (en plano — comparado contra hw_device cookie)
};

const IS_PROD   = process.env.NODE_ENV === "production";
export const COOKIE_NAME = IS_PROD ? "__Host-hw_session" : "hw_session";
const SESSION_TTL = 8 * 60 * 60; // 8 horas en segundos

function getSecret(): Uint8Array {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error("AUTH_SECRET debe tener al menos 32 caracteres.");
  }
  return new TextEncoder().encode(raw);
}

export async function signSession(payload: Omit<SessionPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/** Lee la sesión desde las cookies del request actual (Server Components / Actions). */
export async function getSession(): Promise<SessionPayload | null> {
  const jar   = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Escribe la cookie de sesión respetando las directivas de seguridad del doc. */
export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly:  true,
    secure:    IS_PROD,      // __Host- requiere Secure en prod; en dev HTTP lo omite
    sameSite:  "strict",     // Mitiga CSRF al 100%
    path:      "/",
    maxAge:    SESSION_TTL,
  });
}

/** Borra la cookie de sesión (Server Action / API Route). */
export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "strict",
    path:     "/",
    maxAge:   0,
  });
}

// ── Dispositivo confiable ────────────────────────────────────────────────────

export const DEVICE_COOKIE_NAME = IS_PROD ? "__Host-hw_device" : "hw_device";
const DEVICE_TTL = 365 * 24 * 60 * 60; // 1 año en segundos

/** Escribe la cookie de dispositivo confiable (httpOnly, 1 año). */
export async function setDeviceCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(DEVICE_COOKIE_NAME, token, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "strict",
    path:     "/",
    maxAge:   DEVICE_TTL,
  });
}

/** Borra la cookie de dispositivo (fuerza re-verificación al próximo login). */
export async function clearDeviceCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(DEVICE_COOKIE_NAME, "", {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "strict",
    path:     "/",
    maxAge:   0,
  });
}

/** Refresca el JWT embebiendo el deviceToken confirmado. */
export async function refreshSessionWithDevice(
  session: SessionPayload,
  deviceToken: string,
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- se destructuran para excluirlos de `rest`, no para usarlos
  const { iat: _iat, exp: _exp, ...rest } = session;
  return signSession({ ...rest, deviceToken });
}

/**
 * Versión reforzada de getSession() que además verifica que la cookie hw_device
 * coincida con el deviceToken del JWT. Usar en rutas de gestión de dispositivos
 * para exigir que el propio acceso esté verificado.
 */
export async function getVerifiedSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session?.deviceToken) return null;

  const jar         = await cookies();
  const deviceCookie = jar.get(DEVICE_COOKIE_NAME)?.value;
  if (!deviceCookie || deviceCookie !== session.deviceToken) return null;

  return session;
}
