/**
 * POST /api/auth/logout
 * Cierre de sesión completo:
 * 1. Elimina la cookie de sesión del servidor.
 * 2. Responde con Clear-Site-Data para limpiar cookies/storage/cache del navegador.
 * 3. Redirige a /login.
 *
 * Ref doc: "Tabla 3 — Clear-Site-Data para Cierre de Sesión Seguro"
 * Ref doc: "Testing de Reuso de Identificadores (OWASP)"
 */
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, DEVICE_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // Redirige al login usando req.url como base (evita hardcodear host/puerto).
  // El redirect 303 garantiza que el browser procesa Set-Cookie ANTES de navegar,
  // eliminando la race-condition con window.location.href en el cliente.
  const loginUrl = new URL("/login", req.url);
  const response = NextResponse.redirect(loginUrl, { status: 303 });

  // 1. Eliminar ambas cookies de sesión explícitamente
  const cookieOpts = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path:     "/",
    maxAge:   0,
  };
  response.cookies.set(COOKIE_NAME,        "", cookieOpts);
  response.cookies.set(DEVICE_COOKIE_NAME, "", cookieOpts);

  // 2. Clear-Site-Data — limpia cookies + storage + cache en el navegador cliente
  response.headers.set(
    "Clear-Site-Data",
    '"cookies", "storage", "cache"',
  );

  return response;
}
