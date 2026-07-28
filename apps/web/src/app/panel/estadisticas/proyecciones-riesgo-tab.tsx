import { getProyeccionesRiesgo } from "@/lib/queries";
import { Card, SectionTitle, Badge, type BadgeTone } from "@/components/panel/ui";
import { ProyeccionChart } from "@/components/panel/charts/proyeccion-chart";
import { clp, fecha } from "@/lib/format";
import { Download, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

const TENDENCIA_ICON = { subiendo: TrendingUp, bajando: TrendingDown, estable: Minus };
const TENDENCIA_COLOR = { subiendo: "var(--hw-danger)", bajando: "var(--hw-success)", estable: "var(--hw-text-4)" };
const TENDENCIA_LABEL = { subiendo: "Subiendo", bajando: "Bajando", estable: "Estable" };
const NIVEL_TONE: Record<string, BadgeTone> = { bajo: "green", medio: "amber", alto: "red" };
const NIVEL_LABEL: Record<string, string> = { bajo: "Riesgo bajo", medio: "Riesgo medio", alto: "Riesgo alto" };

export async function ProyeccionesRiesgoTab({ tenantId, tenantPlan }: { tenantId: string; tenantPlan: string | null }) {
  const data = await getProyeccionesRiesgo(tenantId);
  const puedeExportar = tenantPlan === "diamond";
  const TendenciaIcon = TENDENCIA_ICON[data.riesgoMora.tendencia];

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="mb-1 flex items-center justify-between">
          <SectionTitle title="Proyección de ingresos" description="Próximos 6 meses — cifras aproximadas, no un compromiso" />
          {puedeExportar && (
            <a
              href="/api/panel/estadisticas/exportar"
              className="hw-btn flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
              style={{ background: "var(--hw-surface-2)", color: "var(--hw-text-2)" }}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Exportar CSV
            </a>
          )}
        </div>
        <ProyeccionChart data={data.proyeccionIngresos} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Riesgo de mora proyectado" description="Tendencia de los últimos 6 meses" />
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--hw-text-3)" }}>Actual</p>
              <p className="text-2xl font-bold hw-num" style={{ color: "var(--hw-text-1)" }}>{data.riesgoMora.tasaActualPct}%</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--hw-text-3)" }}>Proyectada</p>
              <p className="flex items-center gap-1.5 text-2xl font-bold hw-num" style={{ color: TENDENCIA_COLOR[data.riesgoMora.tendencia] }}>
                {data.riesgoMora.tasaProyectadaPct}%
                <TendenciaIcon className="h-4 w-4" aria-label={`Tendencia: ${TENDENCIA_LABEL[data.riesgoMora.tendencia]}`} />
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs" style={{ color: "var(--hw-text-4)" }}>
            Estimación por tendencia reciente, no un modelo predictivo — úsala como alerta temprana, no como cifra exacta.
          </p>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Contratos por vencer sin renovación" description="≤ 90 días, sin contrato sucesor agendado" />
          {data.alertasRenovacion.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--hw-text-4)" }}>Sin alertas — todo lo que vence pronto ya tiene sucesor o vence lejos.</p>
          ) : (
            <div className="space-y-2">
              {data.alertasRenovacion.map((a) => (
                <div key={a.contratoId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: a.diasRestantes <= 30 ? "var(--hw-danger)" : "var(--hw-warning)" }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate" style={{ color: "var(--hw-text-1)" }}>{a.direccion}</p>
                      <p className="truncate text-xs" style={{ color: "var(--hw-text-4)" }}>{a.arrendatario}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs tabular-nums" style={{ color: "var(--hw-text-3)" }}>{fecha(a.fechaFin)}</span>
                    <Badge tone={NIVEL_TONE[a.riesgoChurn]}>{a.diasRestantes}d</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Stress-test de cartera" description="Ingreso de los próximos 6 meses si un % adicional cae en mora" />
          <div className="space-y-2">
            {data.stressTest.map((s) => (
              <div key={s.escenarioPctMora} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--hw-text-2)" }}>+{s.escenarioPctMora}% de mora</span>
                <span className="font-semibold tabular-nums" style={{ color: "var(--hw-text-1)" }}>{clp(s.ingresoResultanteClp)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs" style={{ color: "var(--hw-text-4)" }}>
            Simulación simple sobre la proyección actual — no un modelo de stress-testing financiero real.
          </p>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Riesgo por arrendatario" description="Historial propio de atrasos — no un credit score real" />
          {data.riesgoPorArrendatario.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--hw-text-4)" }}>Sin suficiente historial de pagos para estimar riesgo.</p>
          ) : (
            <div className="space-y-2">
              {data.riesgoPorArrendatario.map((r) => (
                <div key={r.personaId} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate" style={{ color: "var(--hw-text-1)" }}>{r.nombre}</p>
                    <p className="text-xs" style={{ color: "var(--hw-text-4)" }}>{r.periodosAtrasados} de {r.periodosVencidos} períodos atrasados</p>
                  </div>
                  <Badge tone={NIVEL_TONE[r.nivel]}>{NIVEL_LABEL[r.nivel]}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
