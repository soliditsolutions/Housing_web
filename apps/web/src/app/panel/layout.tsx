import { redirect }    from "next/navigation";
import { getSession }  from "@/lib/auth";
import { prisma }      from "@/lib/db";
import { PanelShell }  from "@/components/panel/shell";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // El middleware ya protege /panel/* pero este check es la defensa en profundidad.
  const session = await getSession();
  if (!session) redirect("/login");

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where:  { id: session.tenantId },
    select: { nombre: true, plan: true },
  });

  return (
    <PanelShell
      tenant={{ nombre: tenant.nombre, plan: tenant.plan ?? null }}
      user={{ nombre: session.nombre, email: session.email, rol: session.rol }}
    >
      {children}
    </PanelShell>
  );
}
