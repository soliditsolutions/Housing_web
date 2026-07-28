"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Bell, CheckCircle2, Clock, Info, Loader2, Mail, Send,
  ShieldCheck, TrendingUp, X,
} from "lucide-react";
import { Badge } from "@/components/panel/ui";
import { FilterToolbar, FilterChip } from "@/components/panel/filter-toolbar";
import { PageSizePicker } from "@/components/panel/page-size-picker";
import { fecha } from "@/lib/format";
import type { NotificacionItem } from "@/lib/queries";
import { generarRecordatorios, marcarSimulada, simularEnvioMasivo, enviarNotificacionesPendientes } from "./actions";
import { useToast } from "@/components/ui/toast";

const TIPO_TONE: Record<string, "red" | "amber" | "blue" | "green" | "slate"> = {
  cobro:                    "red",
  recordatorio_vencimiento: "amber",
  liquidacion_propietario:  "blue",
  voucher_pago:             "green",
  salida_anticipada:        "red",
  termino_contrato:         "slate",
  nuevo_contrato:           "green",
  solicitud_firma:          "blue",
  renovacion_contrato:      "blue",
};

const TIPO_ICON: Record<string, React.ReactNode> = {
  cobro:                    <Bell         className="h-3.5 w-3.5" aria-hidden="true" />,
  recordatorio_vencimiento: <Clock        className="h-3.5 w-3.5" aria-hidden="true" />,
  liquidacion_propietario:  <Mail         className="h-3.5 w-3.5" aria-hidden="true" />,
  voucher_pago:             <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
  solicitud_firma:          <ShieldCheck  className="h-3.5 w-3.5" aria-hidden="true" />,
  renovacion_contrato:      <TrendingUp   className="h-3.5 w-3.5" aria-hidden="true" />,
};

type FiltroEstado = "todas" | "pendiente" | "simulada";
type FiltroTipo   = "todos" | "cobro" | "recordatorio_vencimiento" | "liquidacion_propietario" | "voucher_pago" | "solicitud_firma" | "renovacion_contrato";

const FILTROS_TIPO: { key: FiltroTipo; label: string }[] = [
  { key: "todos",                    label: "Todos los tipos"    },
  { key: "cobro",                    label: "Cobros"             },
  { key: "recordatorio_vencimiento", label: "Recordatorios"      },
  { key: "liquidacion_propietario",  label: "Liquidaciones"      },
  { key: "voucher_pago",             label: "Vouchers"           },
  { key: "solicitud_firma",          label: "Firmas"             },
  { key: "renovacion_contrato",      label: "Renovaciones"       },
];

const GUIDE_KEY = "hw_notif_guide_dismissed";

export function NotificacionesClient({
  notificaciones: inicial,
  emailRealActivo = false,
}: {
  notificaciones: NotificacionItem[];
  emailRealActivo?: boolean;
}) {
  const [noticias, setNoticias]     = useState(inicial);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todas");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [isPending, start]          = useTransition();
  const { show: toast }             = useToast();
  const [pageSize, setPageSize]     = useState(25);
  const [guideVisible, setGuideVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(GUIDE_KEY) !== "1";
  });

  function dismissGuide() {
    localStorage.setItem(GUIDE_KEY, "1");
    setGuideVisible(false);
  }

  const counts = useMemo(() => ({
    todas:     noticias.length,
    pendiente: noticias.filter((n) => n.estado === "pendiente").length,
    simulada:  noticias.filter((n) => n.estado === "simulada").length,
  }), [noticias]);

  const tiposCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const n of noticias) c[n.tipo] = (c[n.tipo] ?? 0) + 1;
    return c;
  }, [noticias]);

  const filtradas = useMemo(() => {
    let r = noticias;
    if (filtroEstado !== "todas") r = r.filter((n) => n.estado === filtroEstado);
    if (filtroTipo   !== "todos") r = r.filter((n) => n.tipo   === filtroTipo);
    return r;
  }, [noticias, filtroEstado, filtroTipo]);

  const pagina = filtradas.slice(0, pageSize);

  async function handleGenerar() {
    start(async () => {
      const r = await generarRecordatorios();
      toast(r.mensaje, r.ok ? "success" : "error");
      if (r.ok && r.creados > 0) window.location.reload();
    });
  }

  async function handleSimularMasivo() {
    start(async () => {
      if (emailRealActivo) {
        const r = await enviarNotificacionesPendientes();
        if (r.ok) {
          toast(
            `${r.enviadas} email(s) enviado(s)${r.errores > 0 ? ` · ${r.errores} error(es)` : ""}${r.sinEmail > 0 ? ` · ${r.sinEmail} sin email` : ""}.`,
            r.errores > 0 ? "error" : "success",
          );
          if (r.enviadas > 0) window.location.reload();
        }
      } else {
        const r = await simularEnvioMasivo();
        if (r.ok) {
          toast(`${r.enviadas} recordatorio(s) marcado(s) como enviados (simulado).`, "success");
          setNoticias((prev) =>
            prev.map((n) => n.estado === "pendiente" ? { ...n, estado: "simulada" as const } : n)
          );
        }
      }
    });
  }

  async function handleMarcar(id: string) {
    start(async () => {
      const r = await marcarSimulada(id);
      if (r.ok) {
        setNoticias((prev) => prev.map((n) => n.id === id ? { ...n, estado: "simulada" as const } : n));
      }
    });
  }

  return (
    <div className="space-y-5">

      {/* ── Guía de primera vez ─────────────────────────── */}
      {guideVisible && (
        <div
          className="hw-card relative overflow-hidden"
          style={{ borderColor: "var(--hw-primary-bd)", background: "var(--hw-primary-lt)" }}
        >
          {/* Franja de color */}
          <div className="absolute inset-y-0 left-0 w-1" style={{ background: "var(--hw-primary)" }} />
          <div className="flex items-start gap-4 p-5 pl-6">
            <Info className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--hw-primary)" }} aria-hidden="true" />
            <div className="flex-1 space-y-2">
              <p className="font-semibold" style={{ color: "var(--hw-primary-dk)" }}>
                ¿Cómo funciona esta página?
              </p>
              <ol className="space-y-1 text-sm" style={{ color: "var(--hw-primary-dk)" }}>
                <li><span className="font-bold">1.</span> Haz clic en <strong>Generar recordatorios</strong> para que Housing cree automáticamente los avisos de cobro y vencimiento basados en tus contratos activos.</li>
                <li><span className="font-bold">2.</span> Revisa la lista — cada notificación irá al arrendatario o propietario correspondiente.</li>
                <li><span className="font-bold">3.</span> Usa <strong>{emailRealActivo ? "Enviar" : "Simular envío"}</strong> para {emailRealActivo ? "enviarlas por email a cada destinatario." : "marcarlas como enviadas (activa el envío real configurando RESEND_API_KEY)."}</li>
              </ol>
              <p className="text-xs" style={{ color: "var(--hw-primary)" }}>
                💡 En producción, los envíos se harán vía email/WhatsApp de forma automática según la cadencia ADR-0008.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissGuide}
              aria-label="Cerrar guía"
              className="hw-btn shrink-0 rounded-lg p-1"
              style={{ color: "var(--hw-primary)" }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* ── Controles: acciones ─────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium" style={{ color: "var(--hw-text-2)" }}>
          {counts.pendiente > 0
            ? <span><span className="font-bold" style={{ color: "var(--hw-primary)" }}>{counts.pendiente}</span> pendiente{counts.pendiente !== 1 ? "s" : ""} de enviar</span>
            : <span style={{ color: "var(--hw-success)" }}>✓ Todo enviado</span>}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={handleGenerar} disabled={isPending}
            className="hw-btn inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--hw-border)", background: "var(--hw-surface)", color: "var(--hw-text-2)" }}
            aria-label="Generar recordatorios automáticos">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Bell className="h-3.5 w-3.5" aria-hidden="true" />}
            Generar recordatorios
          </button>
          {counts.pendiente > 0 && (
            <button type="button" onClick={handleSimularMasivo} disabled={isPending}
              className="hw-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--hw-primary) 0%, var(--hw-sidebar) 100%)", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}
              aria-label={`${emailRealActivo ? "Enviar" : "Simular envío de"} ${counts.pendiente} notificaciones`}>
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
              {emailRealActivo ? `Enviar (${counts.pendiente})` : `Simular envío (${counts.pendiente})`}
            </button>
          )}
        </div>
      </div>

      {/* ── FilterToolbar ───────────────────────────────── */}
      <FilterToolbar>
        {/* Filtros de estado */}
        {([
          { key: "todas",     label: "Todas",     color: "var(--hw-primary-dk)" },
          { key: "pendiente", label: "Pendientes",color: "var(--hw-warning)" },
          { key: "simulada",  label: "Enviadas",  color: "var(--hw-success)" },
        ] as { key: FiltroEstado; label: string; color: string }[]).map((f) => (
          <FilterChip
            key={f.key}
            label={f.label}
            count={counts[f.key]}
            active={filtroEstado === f.key}
            activeColor={f.color}
            onClick={() => setFiltroEstado(f.key)}
          />
        ))}

        {/* Separador visual */}
        <span className="h-6 w-px self-center" style={{ background: "var(--hw-border)" }} aria-hidden="true" />

        {/* Filtros de tipo */}
        {FILTROS_TIPO.filter((f) => f.key === "todos" || (tiposCounts[f.key] ?? 0) > 0).map((f) => (
          <FilterChip
            key={f.key}
            label={f.label}
            count={f.key !== "todos" ? tiposCounts[f.key] : undefined}
            active={filtroTipo === f.key}
            activeColor="var(--hw-primary-dk)"
            onClick={() => setFiltroTipo(f.key)}
          />
        ))}
      </FilterToolbar>

      {/* ── Lista ───────────────────────────────────────── */}
      {filtradas.length === 0 ? (
        <div className="hw-card p-12 text-center" role="status">
          <Bell className="mx-auto h-10 w-10" aria-hidden="true" style={{ color: "var(--hw-text-4)" }} />
          <p className="mt-3 font-semibold" style={{ color: "var(--hw-text-1)" }}>
            {filtroEstado === "pendiente" ? "No hay recordatorios pendientes" : "Sin notificaciones"}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--hw-text-3)" }}>
            {filtroEstado === "pendiente"
              ? `Usa "Generar recordatorios" para crear los avisos según la cadencia configurada.`
              : "Genera los recordatorios automáticos para comenzar."}
          </p>
        </div>
      ) : (
        <div className="hw-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--hw-border)", background: "var(--hw-surface-2)" }}>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--hw-text-4)" }}>Tipo</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--hw-text-4)" }}>Destinatario</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--hw-text-4)" }}>Asunto</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--hw-text-4)" }}>Propiedad</th>
                  <th scope="col" className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--hw-text-4)" }}>Creado</th>
                  <th scope="col" className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--hw-text-4)" }}>Estado</th>
                  <th scope="col" className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="hw-stagger">
                {pagina.map((n, i) => (
                  <tr key={n.id}
                    className="hw-row-hover"
                    style={{
                      borderBottom: i < pagina.length - 1 ? "1px solid var(--hw-border)" : "none",
                      background: n.estado === "pendiente" ? "rgba(37,99,235,0.02)" : undefined,
                    }}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span style={{ color: n.estado === "pendiente" ? "var(--hw-primary)" : "var(--hw-text-4)" }}>
                          {TIPO_ICON[n.tipo] ?? <Bell className="h-3.5 w-3.5" aria-hidden="true" />}
                        </span>
                        <Badge tone={TIPO_TONE[n.tipo] ?? "slate"}>{n.tipoLabel}</Badge>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium" style={{ color: "var(--hw-text-1)" }}>{n.persona.nombre}</p>
                      <p className="text-xs" style={{ color: "var(--hw-text-4)" }}>{n.persona.rut}</p>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <p className="truncate text-sm" style={{ color: "var(--hw-text-2)" }}>{n.asunto}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: "var(--hw-text-3)" }}>
                      {n.propiedad?.direccion ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-xs hw-num" style={{ color: "var(--hw-text-4)" }}>
                      {fecha(n.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge tone={n.estado === "pendiente" ? "amber" : n.estado === "simulada" ? "green" : "blue"}>
                        {n.estado === "simulada" ? "Enviada" : n.estado}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {n.estado === "pendiente" && (
                        <button type="button" onClick={() => handleMarcar(n.id)} disabled={isPending}
                          className="hw-btn text-xs font-medium"
                          style={{ color: "var(--hw-primary)" }}
                          aria-label={`Marcar como enviada: ${n.asunto}`}>
                          Simular envío
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5"
            style={{ borderTop: "1px solid var(--hw-border)", background: "var(--hw-surface-2)" }}
          >
            <span className="text-xs" style={{ color: "var(--hw-text-4)" }}>
              {pagina.length} de {filtradas.length} notificación{filtradas.length !== 1 ? "es" : ""}
            </span>
            <PageSizePicker value={pageSize} onChange={setPageSize} />
          </div>
        </div>
      )}
    </div>
  );
}
