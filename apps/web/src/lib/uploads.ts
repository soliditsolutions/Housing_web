import { join } from "path";

/**
 * Directorio de almacenamiento de documentos (contratos, cédulas subidas en
 * el registro, comprobantes de pago, reconocimientos de deuda).
 *
 * SEC: debe estar SIEMPRE fuera de public/ — cualquier archivo bajo public/
 * es servido por Next.js como estático, sin pasar por autenticación ni por
 * el scoping de tenant/persona de /api/documentos/[id] y
 * /api/portal/documento/[id]. Antes de este fix, el valor por defecto caía
 * dentro de public/uploads/documentos/, dejando cualquier documento
 * descargable por URL directa con solo adivinar el UUID del archivo —
 * el "acceso autenticado" de esas rutas nunca era la única vía real.
 *
 * UPLOADS_PATH permite apuntar a un volumen persistente en producción
 * (Docker volume, disco de red); si no está seteada, usa una carpeta
 * privada junto al proyecto que Next.js nunca sirve como estático.
 */
export const DOCUMENTOS_DIR = process.env.UPLOADS_PATH
  ? join(process.env.UPLOADS_PATH, "documentos")
  : join(process.cwd(), "private-uploads", "documentos");
