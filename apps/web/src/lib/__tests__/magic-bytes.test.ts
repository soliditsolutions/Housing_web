import { describe, it, expect } from "vitest";
import { verificarMagicBytes, ALLOWED_MIME_IMAGES, ALLOWED_MIME_DOCS } from "../magic-bytes";

// ── Helpers para construir buffers de prueba ─────────────────────────────────

function jpegBuffer(trailing: Uint8Array = new Uint8Array(20)) {
  return Buffer.from([0xff, 0xd8, 0xff, ...trailing]);
}

function pngBuffer() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Uint8Array(10)]);
}

function gifBuffer() {
  return Buffer.from([...Buffer.from("GIF8"), ...new Uint8Array(20)]);
}

function webpBuffer() {
  return Buffer.from([
    ...Buffer.from("RIFF"),
    0x00, 0x00, 0x00, 0x00,
    ...Buffer.from("WEBP"),
    ...new Uint8Array(10),
  ]);
}

function pdfBuffer() {
  return Buffer.from([...Buffer.from("%PDF"), ...new Uint8Array(20)]);
}

// ── Tests de magic bytes correctos ──────────────────────────────────────────

describe("verificarMagicBytes() — Fix M4 (CWE-434)", () => {
  it("acepta JPEG válido", () => {
    expect(verificarMagicBytes(jpegBuffer(), "image/jpeg")).toBe(true);
  });

  it("acepta PNG válido", () => {
    expect(verificarMagicBytes(pngBuffer(), "image/png")).toBe(true);
  });

  it("acepta GIF válido", () => {
    expect(verificarMagicBytes(gifBuffer(), "image/gif")).toBe(true);
  });

  it("acepta WebP válido", () => {
    expect(verificarMagicBytes(webpBuffer(), "image/webp")).toBe(true);
  });

  it("acepta PDF válido", () => {
    expect(verificarMagicBytes(pdfBuffer(), "application/pdf")).toBe(true);
  });

  // ── Ataques de MIME spoofing ─────────────────────────────────────────────

  it("rechaza un PDF declarado como JPEG", () => {
    expect(verificarMagicBytes(pdfBuffer(), "image/jpeg")).toBe(false);
  });

  it("rechaza un JPEG declarado como PNG", () => {
    expect(verificarMagicBytes(jpegBuffer(), "image/png")).toBe(false);
  });

  it("rechaza texto plano declarado como PDF", () => {
    const txt = Buffer.from("hello world\n".repeat(10));
    expect(verificarMagicBytes(txt, "application/pdf")).toBe(false);
  });

  it("rechaza HTML declarado como imagen/jpeg", () => {
    const html = Buffer.from("<html><body>xss</body></html>");
    expect(verificarMagicBytes(html, "image/jpeg")).toBe(false);
  });

  it("rechaza MIME type desconocido", () => {
    expect(verificarMagicBytes(jpegBuffer(), "application/x-unknown")).toBe(false);
  });

  it("rechaza buffer vacío", () => {
    expect(verificarMagicBytes(Buffer.alloc(0), "image/jpeg")).toBe(false);
  });

  it("rechaza buffer demasiado corto", () => {
    expect(verificarMagicBytes(Buffer.from([0xff, 0xd8]), "image/jpeg")).toBe(false);
  });

  // ── Sets de MIME permitidos ──────────────────────────────────────────────

  it("ALLOWED_MIME_IMAGES contiene los tipos esperados", () => {
    expect(ALLOWED_MIME_IMAGES.has("image/jpeg")).toBe(true);
    expect(ALLOWED_MIME_IMAGES.has("image/png")).toBe(true);
    expect(ALLOWED_MIME_IMAGES.has("image/webp")).toBe(true);
    expect(ALLOWED_MIME_IMAGES.has("image/gif")).toBe(true);
    expect(ALLOWED_MIME_IMAGES.has("application/pdf")).toBe(false);
  });

  it("ALLOWED_MIME_DOCS contiene application/pdf", () => {
    expect(ALLOWED_MIME_DOCS.has("application/pdf")).toBe(true);
    expect(ALLOWED_MIME_DOCS.has("image/jpeg")).toBe(false);
  });

  it("ALLOWED_MIME_IMAGES no acepta application/octet-stream", () => {
    expect(ALLOWED_MIME_IMAGES.has("application/octet-stream")).toBe(false);
  });
});
