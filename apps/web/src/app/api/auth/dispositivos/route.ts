/**
 * GET  /api/auth/dispositivos — lista los dispositivos confiables del usuario
 * DELETE /api/auth/dispositivos — elimina TODOS los dispositivos del usuario
 */
import { NextResponse } from "next/server";
import { getVerifiedSession, clearSessionCookie, clearDeviceCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const dispositivos = await prisma.dispositivoConfiable.findMany({
    where:   { usuarioId: session.sub },
    select:  { id: true, nombre: true, ipCreacion: true, lastSeenAt: true, createdAt: true },
    orderBy: { lastSeenAt: "desc" },
  });

  return NextResponse.json({ dispositivos });
}

export async function DELETE() {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await prisma.dispositivoConfiable.deleteMany({ where: { usuarioId: session.sub } });

  // Borrar cookies y forzar re-login + re-verificación
  await clearSessionCookie();
  await clearDeviceCookie();

  return NextResponse.json({ ok: true });
}
