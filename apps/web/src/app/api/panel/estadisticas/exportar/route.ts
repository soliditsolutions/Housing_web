import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTenant, getProyeccionesRiesgo } from "@/lib/queries";
import { getAnalyticsTier } from "@/lib/plan-tier";

/**
 * Exportación CSV de "Proyecciones y Riesgo" — exclusiva Diamond (dentro del
 * tier avanzada, que también cubre Gold). Gateada aparte de tierIndex porque
 * es la única diferencia funcional entre Gold y Diamond (ver arquitectura,
 * Fase 2.4): ambos ven los mismos paneles, solo Diamond puede exportarlos.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let tenant;
  try {
    tenant = await getTenant();
  } catch {
    return NextResponse.json({ error: "Servicio no disponible." }, { status: 503 });
  }

  const tier = getAnalyticsTier(tenant.plan);
  const puedeExportar = tier === "avanzada" && tenant.plan === "diamond";
  if (!puedeExportar) {
    return NextResponse.json({ error: "La exportación está disponible solo en el plan Diamond." }, { status: 403 });
  }

  const data = await getProyeccionesRiesgo(tenant.id);

  const filas: string[] = [];
  filas.push("Sección,Mes,Cobrado (CLP),Proyectado (CLP),Aproximado");
  for (const p of data.proyeccionIngresos) {
    filas.push(`Proyección de ingresos,${p.mes},${p.realizadoClp},${p.proyectadoClp},${p.esAproximado ? "Sí" : "No"}`);
  }
  filas.push("");
  filas.push("Sección,Tasa actual (%),Tasa proyectada (%),Tendencia");
  filas.push(`Riesgo de mora,${data.riesgoMora.tasaActualPct},${data.riesgoMora.tasaProyectadaPct},${data.riesgoMora.tendencia}`);
  filas.push("");
  filas.push("Sección,Propiedad,Arrendatario,Vence,Días restantes");
  for (const a of data.alertasRenovacion) {
    filas.push(`Alerta de renovación,"${a.direccion.replace(/"/g, '""')}","${a.arrendatario.replace(/"/g, '""')}",${a.fechaFin.toISOString().slice(0, 10)},${a.diasRestantes}`);
  }

  const csv = "﻿" + filas.join("\n"); // BOM — Excel abre UTF-8 con tildes correctamente
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="proyecciones-riesgo-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
