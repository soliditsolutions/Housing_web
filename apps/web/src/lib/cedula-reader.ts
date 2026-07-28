/**
 * Lector de cédula chilena por el QR del reverso (ADR-0012, tarea #66).
 *
 * El reverso de la cédula trae un QR con una URL del Registro Civil (SIDIV) que
 * incluye el RUN (con dígito verificador) y el nombre. Se decodifica con librería
 * (`zxing-wasm`), se valida el RUN por módulo 11 y se cruza contra lo que el usuario
 * tipeó en el formulario. 100% offline, sin IA.
 *
 * Seguridad: la extracción y validación autoritativas son SERVER-SIDE. El contenido
 * del QR es autoafirmado por la tarjeta (un carnet forjado podría traer cualquier
 * RUN/nombre), por eso la seguridad descansa en tres capas: host oficial del RC +
 * dígito verificador (mod-11) + cross-check contra el formulario. La autenticidad
 * real (que el documento exista) requeriría consultar el servicio del RC (opcional,
 * futuro) — la URL del QR justamente lo apunta.
 */
import { validateRut, canonicalRut } from "./rut";

/** Host oficial del verificador del Registro Civil embebido en el QR de la cédula. */
const SIDIV_HOST = "portal.sidiv.registrocivil.cl";

export type CedulaError =
  | "no_qr"          // no se pudo decodificar ningún QR de la imagen
  | "no_url"         // el QR no contiene una URL
  | "host_invalido"  // la URL no es del Registro Civil
  | "no_es_cedula"   // type != CEDULA
  | "run_ausente"
  | "run_invalido"   // no pasa el dígito verificador
  | "nombre_ausente";

export type CedulaLeida =
  | { ok: true; rut: string; nombre: string }
  | { ok: false; error: CedulaError };

/** Normaliza un nombre para comparación: sin acentos, mayúsculas, solo letras y espacios. */
function normalizarNombre(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // marcas diacríticas combinantes (acentos)
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compara el nombre tipeado contra el del carnet por conjunto de tokens (orden
 * independiente: da igual apellidos-primero o nombres-primero). Exige coincidir al
 * menos el 70% de las palabras del nombre ingresado (mínimo 2), tolerando segundos
 * nombres omitidos o el orden distinto.
 */
export function nombresCoinciden(ingresado: string, carnet: string): boolean {
  const ni = normalizarNombre(ingresado).split(" ").filter((w) => w.length > 2);
  const nc = normalizarNombre(carnet).split(" ").filter((w) => w.length > 2);
  if (ni.length < 2) return false;
  const requerido = Math.max(2, Math.ceil(ni.length * 0.7));
  const coincidencias = ni.filter((w) => nc.includes(w)).length;
  return coincidencias >= requerido;
}

/**
 * Parsea el texto de un QR de cédula (URL del Registro Civil) y extrae RUN + nombre.
 * Función PURA: valida host, tipo, presencia del RUN y su dígito verificador.
 */
export function parsearQrCedula(qrText: string): CedulaLeida {
  let u: URL;
  try {
    u = new URL((qrText ?? "").trim());
  } catch {
    return { ok: false, error: "no_url" };
  }

  if (u.host.toLowerCase() !== SIDIV_HOST) return { ok: false, error: "host_invalido" };
  if ((u.searchParams.get("type") ?? "").toUpperCase() !== "CEDULA") return { ok: false, error: "no_es_cedula" };

  const runRaw = u.searchParams.get("RUN");
  if (!runRaw || !runRaw.trim()) return { ok: false, error: "run_ausente" };
  if (!validateRut(runRaw)) return { ok: false, error: "run_invalido" };

  const nombreRaw = u.searchParams.get("name");
  if (!nombreRaw || !nombreRaw.trim()) return { ok: false, error: "nombre_ausente" };

  return { ok: true, rut: canonicalRut(runRaw), nombre: nombreRaw.replace(/\s+/g, " ").trim() };
}

export interface VerificacionIdentidad {
  rutCoincide: boolean;
  nombreCoincide: boolean;
  /** true solo si RUT y nombre coinciden con el formulario. */
  ok: boolean;
}

/**
 * Cross-check autoritativo: compara el RUN/nombre extraídos de la cédula contra lo
 * que el usuario declaró en el formulario. Es la capa que impide aceptar una cédula
 * cuyo RUN o nombre no corresponden a los datos ingresados.
 */
export function verificarIdentidadCedula(
  cedula: { rut: string; nombre: string },
  formulario: { rut: string; nombre: string },
): VerificacionIdentidad {
  const rutCoincide = canonicalRut(cedula.rut) === canonicalRut(formulario.rut);
  const nombreCoincide = nombresCoinciden(formulario.nombre, cedula.nombre);
  return { rutCoincide, nombreCoincide, ok: rutCoincide && nombreCoincide };
}

/**
 * Decodifica el QR de una imagen de cédula (bytes JPEG/PNG) y extrae RUN + nombre.
 * Wrapper delgado sobre `zxing-wasm` (import dinámico: no se carga al testear la
 * lógica pura). Validado end-to-end en la POC con una cédula real.
 */
export async function leerCedulaDesdeImagen(bytes: Uint8Array): Promise<CedulaLeida> {
  const { readBarcodes } = await import("zxing-wasm/reader");

  // zxing-wasm decodifica formatos de imagen (JPEG/PNG) directamente desde un Blob.
  const resultados = await readBarcodes(new Blob([bytes as BlobPart]), {
    formats: ["QRCode"],
    tryHarder: true,
  });

  const qrText = resultados[0]?.text;
  if (!qrText) return { ok: false, error: "no_qr" };
  return parsearQrCedula(qrText);
}
