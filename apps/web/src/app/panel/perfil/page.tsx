import { redirect }            from "next/navigation";
import { getSession }          from "@/lib/auth";
import { withTenant }          from "@/lib/tenant-db";
import { SetupDialog }         from "./setup-dialog";
import { PerfilForm }          from "./perfil-form";
import { DispositivosSection } from "./dispositivos-section";
import { TabNav }              from "@/components/panel/tab-nav";

export const metadata = { title: "Mi perfil — Housing" };

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string; tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;

  const usuario = await withTenant(session.tenantId, (tx) => tx.usuario.findUnique({
    where:  { id: session.sub },
    select: {
      nombre:          true,
      email:           true,
      rut:             true,
      telefono:        true,
      fechaNacimiento: true,
      direccion:       true,
      ciudad:          true,
      region:          true,
      fotoPerfil:      true,
      perfilCompleto:  true,
    },
  }));

  if (!usuario) redirect("/login");

  const perfil = {
    nombre:          usuario.nombre,
    email:           usuario.email,
    rut:             usuario.rut,
    telefono:        usuario.telefono,
    fechaNacimiento: usuario.fechaNacimiento,
    direccion:       usuario.direccion,
    ciudad:          usuario.ciudad,
    region:          usuario.region,
    fotoPerfil:      usuario.fotoPerfil,
    perfilCompleto:  usuario.perfilCompleto,
  };

  const tab = (sp.tab ?? "datos") as "datos" | "seguridad" | "dispositivos";

  return (
    <>
      {sp.setup === "1" && <SetupDialog />}

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Encabezado */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--hw-text-1)" }}
          >
            Mi perfil
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--hw-text-3)" }}>
            Configura tus datos personales y de seguridad.
          </p>
        </div>

        {/* ── Tab nav ───────────────────────────────────────────────────── */}
        <TabNav
          tabs={[
            { key: "datos",        label: "Datos personales" },
            { key: "seguridad",    label: "Seguridad" },
            { key: "dispositivos", label: "Dispositivos" },
          ]}
          activeTab={tab}
          baseHref="/panel/perfil"
        />

        {/* ── Contenido por tab ─────────────────────────────────────────── */}
        {(tab === "datos" || tab === "seguridad") && (
          <PerfilForm perfil={perfil} section={tab} />
        )}
        {tab === "dispositivos" && <DispositivosSection />}
      </div>
    </>
  );
}
