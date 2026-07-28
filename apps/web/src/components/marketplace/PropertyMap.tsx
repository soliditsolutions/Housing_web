"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";

// Leaflet usa `window`/`document` — debe cargarse únicamente en el navegador.
const LeafletMapInner = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center" style={{ background: "var(--pf-hero-1)" }}>
      <MapPin className="h-6 w-6 animate-pulse" style={{ color: "var(--pf-border-input)" }} aria-hidden />
    </div>
  ),
});

export type PropertyMapProps = {
  latitud: number;
  longitud: number;
  /** true = pin exacto (autorizado por el corredor); false = solo área aproximada. */
  exacta: boolean;
};

export function PropertyMap({ latitud, longitud, exacta }: PropertyMapProps) {
  return (
    <div className="pf-card overflow-hidden p-0">
      <div className="p-5 pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--pf-text-light)" }}>
          Ubicación
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--pf-text-muted)" }}>
          {exacta
            ? "El corredor autorizó mostrar la ubicación exacta de esta propiedad."
            : "Área aproximada — el corredor no ha autorizado mostrar la dirección exacta. Contacta para coordinar una visita."}
        </p>
      </div>
      <div className="h-64 w-full sm:h-80">
        <LeafletMapInner latitud={latitud} longitud={longitud} exacta={exacta} />
      </div>
    </div>
  );
}
