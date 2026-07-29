import { getActor } from "@/lib/queries";
import { getEquipo, getInvitacionesPendientes } from "./actions";
import { PageTitle } from "@/components/panel/ui";
import { EquipoClient } from "./equipo-client";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  // El proxy ya bloquea /panel/equipo para no-managers vía session.rol; este
  // getActor() (usado dentro de getEquipo()) es la defensa en profundidad.
  const actor = await getActor();

  const [colaboradores, invitaciones] = await Promise.all([
    getEquipo(),
    getInvitacionesPendientes(actor.tenantId),
  ]);

  return (
    <>
      <PageTitle
        title="Equipo"
        subtitle="Invita colaboradores y gestiona quién tiene acceso a tu cuenta."
      />
      <EquipoClient
        colaboradores={colaboradores.map((c) => ({
          id:                     c.id,
          nombre:                 c.nombre,
          email:                  c.email,
          desactivado:            c.desactivadoEn !== null,
          propiedadesAsignadas:   c._count.propiedadesAsignadas,
        }))}
        invitaciones={invitaciones.map((i) => ({
          id:        i.id,
          nombre:    i.nombre,
          email:     i.email,
          expiresAt: i.expiresAt.toISOString(),
        }))}
      />
    </>
  );
}
