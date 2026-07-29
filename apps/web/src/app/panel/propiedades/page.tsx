import { getActor, getPropiedades, getColaboradoresActivos } from "@/lib/queries";
import { PageTitle } from "@/components/panel/ui";
import { PropiedadesClient } from "./propiedades-client";

export const dynamic = "force-dynamic";

export default async function PropiedadesPage() {
  const actor = await getActor();
  const esManager = actor.rol === "manager";
  const [propiedades, colaboradores] = await Promise.all([
    getPropiedades(actor.tenantId),
    // ROL-UI-5 (ADR-0013): el selector de colaborador es exclusivo del Manager
    // — ni siquiera se cargan los datos para un Colaborador.
    esManager ? getColaboradoresActivos(actor.tenantId) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageTitle
        title="Propiedades"
        subtitle="Inventario de la corredora — haz clic en una card para ver el detalle."
      />
      <PropiedadesClient propiedades={propiedades} esManager={esManager} colaboradores={colaboradores} />
    </>
  );
}
