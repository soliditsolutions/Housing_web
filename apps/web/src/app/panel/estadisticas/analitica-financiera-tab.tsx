import { getAnaliticaFinanciera } from "@/lib/queries";
import { Card, StatCard, SectionTitle } from "@/components/panel/ui";
import { MiniLine } from "@/components/panel/charts/mini-line";
import { MiniBarSeries } from "@/components/panel/charts/mini-bar-series";
import { MiniDonut } from "@/components/panel/charts/mini-donut";
import { clp } from "@/lib/format";
import { Coins, TrendingUp, CheckCircle2 } from "lucide-react";

export async function AnaliticaFinancieraTab({ tenantId }: { tenantId: string }) {
  const data = await getAnaliticaFinanciera(tenantId);

  const donutCartera = data.carteraPorDenominacion.map((c) => ({
    label: c.denominacion === "UF" ? "Contratos en UF" : "Contratos en CLP",
    value: c.contratos,
    color: c.denominacion === "UF" ? "var(--hw-primary)" : "var(--hw-success)",
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Ticket promedio de arriendo"
          value={clp(data.ticketPromedioClp)}
          sub="Contratos vigentes, normalizado a CLP"
          tone="blue"
          icon={<Coins className="h-4 w-4" />}
        />
        <StatCard
          label="Comisión del mes en curso"
          value={clp(data.comisionGanadaPorMes.at(-1)?.monto ?? 0)}
          sub="Comisiones activadas este mes"
          tone="green"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Collection Rate"
          value={`${data.collectionRatePct}%`}
          sub="Cobrado dentro de 5 días desde el vencimiento (12m)"
          tone={data.collectionRatePct < 70 ? "amber" : "green"}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Ingresos cobrados" description="Últimos 12 meses" />
          <MiniLine data={data.ingresosCobradosPorMes} xKey="mes" yKey="monto" color="var(--hw-success)" format="clpCompact" />
        </Card>

        <Card className="p-5">
          <SectionTitle title="Comisión ganada" description="Últimos 12 meses" />
          <MiniBarSeries
            data={data.comisionGanadaPorMes}
            xKey="mes"
            format="clpCompact"
            series={[{ key: "monto", label: "Comisión", color: "var(--hw-primary)" }]}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle title="Cartera por denominación" description="Contratos vigentes" />
          <div className="flex items-center gap-6">
            <MiniDonut data={donutCartera} height={140} />
            <div className="space-y-2 text-sm">
              {data.carteraPorDenominacion.map((c) => (
                <div key={c.denominacion}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ background: c.denominacion === "UF" ? "var(--hw-primary)" : "var(--hw-success)" }}
                    />
                    <span style={{ color: "var(--hw-text-2)" }}>{c.denominacion}</span>
                    <span className="font-semibold" style={{ color: "var(--hw-text-1)" }}>{c.contratos}</span>
                  </div>
                  <p className="ml-4.5 text-xs" style={{ color: "var(--hw-text-4)" }}>{clp(c.montoClp)} en renta mensual</p>
                </div>
              ))}
              {donutCartera.length === 0 && (
                <p className="text-xs" style={{ color: "var(--hw-text-4)" }}>Sin contratos vigentes.</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Evolución de morosidad" description="Últimos 12 meses" />
          <MiniLine
            data={data.evolucionMorosidad}
            xKey="mes"
            yKey="tasaPct"
            color="var(--hw-danger)"
            format="pct"
          />
        </Card>
      </div>
    </div>
  );
}
