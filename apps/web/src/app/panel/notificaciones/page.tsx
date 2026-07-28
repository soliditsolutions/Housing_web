import { getTenant, getNotificaciones } from "@/lib/queries";
import { tieneEmailReal } from "@/lib/email";
import { PageTitle } from "@/components/panel/ui";
import { NotificacionesClient } from "./notificaciones-client";

export const dynamic = "force-dynamic";

export default async function NotificacionesPage() {
  const tenant = await getTenant();
  const notificaciones = await getNotificaciones(tenant.id);

  return (
    <>
      <PageTitle
        title="Notificaciones"
        subtitle="Recordatorios y avisos automáticos enviados a arrendatarios y propietarios."
      />
      <NotificacionesClient
        notificaciones={notificaciones}
        emailRealActivo={tieneEmailReal()}
      />
    </>
  );
}
