/**
 * Test end-to-end del decodificador de imagen del lector de cédula (#66).
 * Genera un QR sintético con una URL del Registro Civil FALSA (RUT de test, sin PII
 * real) y verifica el pipeline completo: imagen → decodificar QR (zxing-wasm) →
 * parsear → validar. No se usa ni se commitea la cédula real.
 */
import { describe, it, expect } from "vitest";
import QRCode from "qrcode";
import { leerCedulaDesdeImagen } from "../cedula-reader";

async function qrPng(texto: string): Promise<Uint8Array> {
  const buf = await QRCode.toBuffer(texto, { type: "png", width: 400, errorCorrectionLevel: "M" });
  return new Uint8Array(buf);
}

describe("leerCedulaDesdeImagen() — pipeline completo imagen→datos", () => {
  it("decodifica un QR de cédula sintético y extrae RUN + nombre", async () => {
    const url =
      "https://portal.sidiv.registrocivil.cl/docstatus?RUN=11111111-1&type=CEDULA&serial=ABC&mrz=XYZ&name=JUAN%20PEREZ%20SOTO";
    const png = await qrPng(url);

    const r = await leerCedulaDesdeImagen(png);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rut).toBe("11111111-1");
      expect(r.nombre).toBe("JUAN PEREZ SOTO");
    }
  }, 20000);

  it("devuelve error 'no_qr' si la imagen no contiene ningún QR", async () => {
    // PNG 1x1 blanco (sin QR).
    const blanco = new Uint8Array(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    );
    const r = await leerCedulaDesdeImagen(blanco);
    expect(r).toEqual({ ok: false, error: "no_qr" });
  }, 20000);
});
