import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import VerificarForm from "./verificar-form";

export const metadata = { title: "Verificar dispositivo — Housing" };

export default async function VerificarDispositivoPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Si ya tiene deviceToken en el JWT, redirigir al panel
  if (session.deviceToken) redirect("/panel");

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: "var(--hw-page)" }}
    >
      {/* Fondo aurora boreal a pantalla completa (decorativo) */}
      <div className="hw-aurora-layer" aria-hidden="true" />

      <div className="relative z-10 flex w-full justify-center">
        <VerificarForm email={session.email} nombre={session.nombre} />
      </div>
    </div>
  );
}
