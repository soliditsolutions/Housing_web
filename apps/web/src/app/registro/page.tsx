import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, FileText, Users } from "lucide-react";
import { RegistroForm } from "./registro-form";
import { PhotoBanner } from "@/components/public/PhotoBanner";
import bannerFamily from "@/images/banners/bannerFamily.png";

export const metadata: Metadata = {
  title: "Crear cuenta — Housing",
};

const benefits = [
  { icon: Users,      text: "Gestiona tus propiedades y arrendatarios en un solo lugar" },
  { icon: FileText,   text: "Contratos, cobros y liquidaciones automatizadas"            },
  { icon: Lock,       text: "Seguridad de nivel bancario con cifrado de extremo a extremo" },
  { icon: ShieldCheck, text: "Cumplimiento Ley 21.719 · Protección de datos · Chile 2026" },
];

export default function RegistroPage() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "var(--hw-page)" }}>

      {/* Fondo aurora boreal a pantalla completa (decorativo) */}
      <div className="hw-aurora-layer" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen">

      {/* ── Panel izquierdo — branding ── */}
      <aside
        className="hw-auth-aside hidden lg:flex flex-col justify-between w-[420px] xl:w-[480px] shrink-0 p-10 relative overflow-hidden"
        aria-hidden="true"
      >
        <PhotoBanner src={bannerFamily} objectPosition="80% 40%" priority />

        <div className="relative z-10">
          <Link href="/" className="flex items-baseline gap-2 transition-opacity hover:opacity-80">
            <span className="text-2xl font-bold tracking-tight" style={{ color: "var(--hw-sidebar-text)" }}>Housing</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>SOLIDIT</span>
          </Link>
          <p className="mt-1 text-sm" style={{ color: "var(--hw-sidebar-muted)" }}>Panel del corredor</p>

          <div className="mt-10 mb-8" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

          <h1 className="text-3xl font-bold leading-snug tracking-tight" style={{ color: "var(--hw-sidebar-text)" }}>
            Empieza gratis,{" "}
            <span className="hw-sidebar-headline-accent">sin complicaciones.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--hw-sidebar-muted)" }}>
            Crea tu cuenta en minutos y comienza a gestionar tus arriendos con total control y seguridad.
          </p>

          <ul className="mt-8 space-y-4">
            {benefits.map((b) => (
              <li key={b.text} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.10)" }}>
                  <b.icon className="h-3.5 w-3.5" style={{ color: "var(--hw-primary-bd)" }} />
                </div>
                <span className="text-sm" style={{ color: "rgba(255,255,255,0.70)" }}>{b.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <div className="mb-5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.40)" }}
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--hw-success)" }} />
            Plan Gratuito · Sin tarjeta de crédito · Cancela cuando quieras
          </div>
        </div>
      </aside>

      {/* ── Panel derecho — formulario ── */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <Link href="/" className="mb-8 flex items-baseline gap-2 lg:hidden transition-opacity hover:opacity-70">
            <span className="text-xl font-bold tracking-tight" style={{ color: "var(--hw-text-1)" }}>Housing</span>
            <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--hw-text-4)" }}>SOLIDIT</span>
          </Link>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--hw-text-1)" }}>
              Crea tu cuenta
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--hw-text-3)" }}>
              Comienza gratis — plan Gratuito, sin tarjeta de crédito.
            </p>
          </div>

          <div className="hw-auth-card p-6">
            <RegistroForm />
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
