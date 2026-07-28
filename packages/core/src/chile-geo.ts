/**
 * Geografía administrativa de Chile (regiones y comunas) y orientaciones
 * de propiedad — fachada en español sobre el paquete "chilean-territorial-divisions"
 * (346 comunas, 16 regiones, códigos CUT oficiales, MIT).
 *
 * El objetivo es que región/comuna se seleccionen desde una lista cerrada
 * en vez de tipearse libremente, evitando que un mismo lugar quede guardado
 * con distintos strings (ej: "Metropolitana" vs "Región Metropolitana de Santiago").
 *
 * Se usa el NOMBRE de la región (no el código romano ni el ISO) como valor
 * canónico, porque así es como ya se guarda en la base de datos.
 */
import { getRegiones, getComunas } from "chilean-territorial-divisions";

/** Nombres de las 16 regiones de Chile, en el mismo orden oficial (Arica → Magallanes). */
export const REGIONES_CHILE: readonly string[] = getRegiones().map((r) => r.region);

const REGION_NUMBER_POR_NOMBRE = new Map(
  getRegiones().map((r) => [r.region, r.region_number]),
);

/** Comunas de una región, dado el nombre exacto de la región (string vacío si no existe). */
export function getComunasDeRegion(nombreRegion: string): string[] {
  const numero = REGION_NUMBER_POR_NOMBRE.get(nombreRegion);
  if (!numero) return [];
  return getComunas(numero).map((c) => c.name);
}

/** true si el nombre corresponde exactamente a una de las 16 regiones de Chile. */
export function esRegionValida(nombreRegion: string): boolean {
  return REGION_NUMBER_POR_NOMBRE.has(nombreRegion);
}

/** true si la comuna pertenece exactamente a la región indicada. */
export function esComunaValidaEnRegion(comuna: string, nombreRegion: string): boolean {
  return getComunasDeRegion(nombreRegion).includes(comuna);
}

/**
 * Orientación de una propiedad — convención estándar chilena de bienes raíces
 * (N/S/Oriente/Poniente + combinaciones), reemplaza el texto libre que antes
 * mezclaba formatos ("NP", "Poniente", "S", etc. sin lista fija).
 */
export const ORIENTACIONES: readonly { value: string; label: string }[] = [
  { value: "N",  label: "Norte" },
  { value: "S",  label: "Sur" },
  { value: "O",  label: "Oriente" },
  { value: "P",  label: "Poniente" },
  { value: "NO", label: "Nororiente" },
  { value: "NP", label: "Norponiente" },
  { value: "SO", label: "Suroriente" },
  { value: "SP", label: "Surponiente" },
];

/** true si el valor corresponde a una de las 8 orientaciones válidas. */
export function esOrientacionValida(orientacion: string): boolean {
  return ORIENTACIONES.some((o) => o.value === orientacion);
}
