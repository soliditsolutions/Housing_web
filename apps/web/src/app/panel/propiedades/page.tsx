import { getTenant, getPropiedades } from "@/lib/queries";
import { PageTitle } from "@/components/panel/ui";
import { PropiedadesClient } from "./propiedades-client";

export const dynamic = "force-dynamic";

export default async function PropiedadesPage() {
  const tenant = await getTenant();
  const propiedades = await getPropiedades(tenant.id);

  return (
    <>
      <PageTitle
        title="Propiedades"
        subtitle="Inventario de la corredora — haz clic en una card para ver el detalle."
      />
      <PropiedadesClient propiedades={propiedades} />
    </>
  );
}
