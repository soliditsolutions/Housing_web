import Link from "next/link";
import { Plus } from "lucide-react";
import { getTenant, getContratos } from "@/lib/queries";
import { PageTitle } from "@/components/panel/ui";
import { ContratosClient } from "./contratos-client";

export const dynamic = "force-dynamic";

export default async function ContratosPage() {
  const tenant = await getTenant();
  const contratos = await getContratos(tenant.id);

  return (
    <>
      <PageTitle
        title="Contratos"
        subtitle="Arriendos vigentes y su configuración."
        action={
          <Link
            href="/panel/contratos/nuevo"
            className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--hw-primary)" }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo contrato
          </Link>
        }
      />
      <ContratosClient contratos={contratos} />
    </>
  );
}
