/**
 * Verificación de magic bytes — valida que el contenido real del archivo
 * coincida con el MIME type declarado.
 *
 * SEGURIDAD (CWE-434 — Unrestricted Upload of File with Dangerous Type):
 * El MIME type enviado por el browser es manipulable por el cliente.
 * Los primeros bytes del archivo (magic bytes / file signature) reflejan
 * el contenido real y no pueden ser alterados sin corromper el archivo.
 *
 * Refs:
 *   - OWASP File Upload Cheat Sheet
 *   - CWE-434: Unrestricted Upload of File with Dangerous Type
 */

/** MIMEs de imagen permitidos en el sistema. */
export const ALLOWED_MIME_IMAGES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** MIMEs de documento permitidos en el sistema. */
export const ALLOWED_MIME_DOCS = new Set(["application/pdf"]);

/** Todos los MIMEs permitidos. */
export const ALLOWED_MIME_ALL = new Set([
  ...ALLOWED_MIME_IMAGES,
  ...ALLOWED_MIME_DOCS,
]);

/** MIME → extensión de archivo segura (nunca usar el nombre original). */
export const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg":      "jpg",
  "image/png":       "png",
  "image/webp":      "webp",
  "image/gif":       "gif",
  "application/pdf": "pdf",
};

/**
 * Verifica los magic bytes del buffer contra el MIME declarado.
 * Devuelve `true` solo si el contenido real coincide con el tipo anunciado.
 */
export function verificarMagicBytes(buffer: Buffer, mime: string): boolean {
  if (buffer.length < 12) return false;

  switch (mime) {
    case "image/jpeg":
      // JPEG: FF D8 FF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    case "image/png":
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      return (
        buffer[0] === 0x89 && buffer[1] === 0x50 &&
        buffer[2] === 0x4e && buffer[3] === 0x47 &&
        buffer[4] === 0x0d && buffer[5] === 0x0a &&
        buffer[6] === 0x1a && buffer[7] === 0x0a
      );

    case "image/gif":
      // GIF: GIF8
      return buffer.subarray(0, 4).toString("ascii") === "GIF8";

    case "image/webp":
      // WebP: RIFF????WEBP
      return (
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );

    case "application/pdf":
      // PDF: %PDF
      return buffer.subarray(0, 4).toString("ascii") === "%PDF";

    default:
      return false;
  }
}
