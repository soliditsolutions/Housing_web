/**
 * Anillo de carga blanco, pensado para botones de fondo oscuro o primario
 * (login, registro, modales, envíos). Para spinners sobre fondo claro dentro
 * del panel usamos el icono <Loader2> de lucide-react.
 */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full border-2 border-white/30 border-t-white animate-spin ${className}`}
    />
  );
}
