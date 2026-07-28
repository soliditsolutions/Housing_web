/**
 * Proxy de protección de rutas (Next.js 16 — antes "middleware").
 *
 * Capas de seguridad:
 *  1. Sesión JWT válida para /panel/* y /verificar-dispositivo
 *  2. Dispositivo confiable verificado para /panel/*
 *     (cookie hw_device debe coincidir con deviceToken embebido en JWT)
 *  3. Sesión JWT portal para /portal/contrato/* (solo lectura, 30 min)
 *  4. CSP con nonce por request (script-src nonce-based, sin 'unsafe-inline')
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME, DEVICE_COOKIE_NAME } from "@/lib/auth";
import { verifyPortalToken, PORTAL_COOKIE_NAME } from "@/lib/portal-auth";

/** Genera un nonce criptográfico aleatorio para CSP por request. */
function generarNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64");
}

/** Construye el CSP header con el nonce dado. */
function buildCsp(nonce: string): string {
  const isProd = process.env.NODE_ENV === "production";
  return [
    "default-src 'self'",
    // 'strict-dynamic' propaga la confianza del nonce a los scripts que este carga
    // 'unsafe-eval' solo en dev (Next.js HMR / Turbopack lo necesita)
    `script-src 'nonce-${nonce}' 'strict-dynamic'${isProd ? "" : " 'unsafe-eval'"}`,
    // Tailwind v4 genera un stylesheet externo; shadcn usa inline styles → 'unsafe-inline' en style-src es el mínimo necesario
    "style-src 'self' 'unsafe-inline'",
    // *.tile.openstreetmap.org: tiles del mapa de ubicación — marketplace
    // público, panel del corredor y portal del arrendatario
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isProd ? "upgrade-insecure-requests" : "",
  ].filter(Boolean).join("; ");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token        = request.cookies.get(COOKIE_NAME)?.value;
  const session      = token ? await verifyToken(token) : null;

  // Generar nonce para CSP y propagarlo como request header (legible por Server Components via headers())
  const nonce = generarNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  // Helper: respuesta NextResponse.next() con nonce propagado.
  // CSP solo en producción — en dev Turbopack y React necesitan eval() sin restricciones.
  function nextWithNonce(): NextResponse {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    if (process.env.NODE_ENV === "production") {
      res.headers.set("Content-Security-Policy", buildCsp(nonce));
    }
    return res;
  }

  // ── Páginas públicas de auth ─────────────────────────────────────────────
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/recuperar-contrasena");

  if (isAuthPage && session) {
    if (session.deviceToken) {
      return NextResponse.redirect(new URL("/panel", request.url));
    }
    return NextResponse.redirect(new URL("/verificar-dispositivo", request.url));
  }

  // ── Página de verificación de dispositivo ────────────────────────────────
  if (pathname === "/verificar-dispositivo") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.deviceToken) {
      const deviceCookie = request.cookies.get(DEVICE_COOKIE_NAME)?.value;
      if (deviceCookie && deviceCookie === session.deviceToken) {
        return NextResponse.redirect(new URL("/panel", request.url));
      }
    }
    return nextWithNonce();
  }

  // ── Rutas del panel ──────────────────────────────────────────────────────
  if (pathname.startsWith("/panel")) {
    if (!session) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      if (token) response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
      return response;
    }

    const isPerfilPage = pathname.startsWith("/panel/perfil");
    if (!isPerfilPage && session.perfilCompleto === false) {
      return NextResponse.redirect(new URL("/panel/perfil?setup=1", request.url));
    }

    const deviceCookie = request.cookies.get(DEVICE_COOKIE_NAME)?.value;
    const jwtDevice    = session.deviceToken;

    if (!jwtDevice || !deviceCookie || deviceCookie !== jwtDevice) {
      return NextResponse.redirect(new URL("/verificar-dispositivo", request.url));
    }
  }

  // ── Portal de autoconsulta — /portal/contrato/* ─────────────────────────
  if (pathname.startsWith("/portal/contrato")) {
    const portalToken   = request.cookies.get(PORTAL_COOKIE_NAME)?.value;
    const portalSession = portalToken ? await verifyPortalToken(portalToken) : null;
    if (!portalSession) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  return nextWithNonce();
}

export const config = {
  matcher: [
    "/panel/:path*",
    "/verificar-dispositivo",
    "/login/:path*", "/login",
    "/registro",
    "/recuperar-contrasena",
    "/portal/contrato/:path*",
  ],
};
