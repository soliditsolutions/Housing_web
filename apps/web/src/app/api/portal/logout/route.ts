import { NextRequest, NextResponse } from "next/server";
import { clearPortalCookie } from "@/lib/portal-auth";

export async function GET(req: NextRequest) {
  await clearPortalCookie();
  // Usa el origen de la propia request (igual que /api/auth/logout) en vez de
  // NEXT_PUBLIC_APP_URL: esa variable es opcional y su fallback anterior
  // (localhost:3002) apuntaba a un puerto sin nada corriendo, dejando al
  // usuario en una página muerta al cerrar sesión desde el portal.
  return NextResponse.redirect(new URL("/portal", req.url));
}
