/**
 * Tests de la lógica pura del lector de cédula (ADR-0012, tarea #66):
 * parseo del QR del Registro Civil, validación de RUN (mod-11) y cross-check de
 * identidad contra el formulario. NO cubre el decodificador de imagen
 * (`leerCedulaDesdeImagen`), validado end-to-end en la POC con una cédula real —
 * no se commitea PII real como fixture.
 */
import { describe, it, expect } from "vitest";
import { parsearQrCedula, nombresCoinciden, verificarIdentidadCedula } from "../cedula-reader";

const RUN_VALIDO = "11111111-1"; // DV mod-11 correcto (no es persona real)

function urlRC(params: Record<string, string>): string {
  const base = new URLSearchParams({ serial: "B6C303661", mrz: "XYZ" });
  for (const [k, v] of Object.entries(params)) base.set(k, v);
  return `https://portal.sidiv.registrocivil.cl/docstatus?${base.toString()}`;
}

describe("parsearQrCedula() — caso válido", () => {
  it("extrae RUN canónico y nombre de una URL del Registro Civil", () => {
    const r = parsearQrCedula(urlRC({ RUN: RUN_VALIDO, type: "CEDULA", name: "JUAN ALEJANDRO PÉREZ SOTO" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rut).toBe("11111111-1");
      expect(r.nombre).toBe("JUAN ALEJANDRO PÉREZ SOTO");
    }
  });

  it("acepta el formato real del QR (RUN con puntos y guión)", () => {
    const r = parsearQrCedula(urlRC({ RUN: "11.111.111-1", type: "CEDULA", name: "ANA SOTO DÍAZ" }));
    expect(r.ok).toBe(true);
  });
});

describe("parsearQrCedula() — rechazos (fail-closed)", () => {
  it("rechaza texto que no es URL", () => {
    expect(parsearQrCedula("no soy una url")).toEqual({ ok: false, error: "no_url" });
  });

  it("rechaza un QR de otro host (no Registro Civil)", () => {
    const url = `https://malicioso.example.com/docstatus?RUN=${RUN_VALIDO}&type=CEDULA&name=X`;
    expect(parsearQrCedula(url)).toEqual({ ok: false, error: "host_invalido" });
  });

  it("rechaza si type != CEDULA", () => {
    expect(parsearQrCedula(urlRC({ RUN: RUN_VALIDO, type: "PASAPORTE", name: "X Y" })))
      .toEqual({ ok: false, error: "no_es_cedula" });
  });

  it("rechaza si falta el RUN", () => {
    expect(parsearQrCedula(urlRC({ type: "CEDULA", name: "X Y" })))
      .toEqual({ ok: false, error: "run_ausente" });
  });

  it("rechaza un RUN con dígito verificador inválido", () => {
    expect(parsearQrCedula(urlRC({ RUN: "11111111-9", type: "CEDULA", name: "X Y" })))
      .toEqual({ ok: false, error: "run_invalido" });
  });

  it("rechaza si falta el nombre", () => {
    expect(parsearQrCedula(urlRC({ RUN: RUN_VALIDO, type: "CEDULA" })))
      .toEqual({ ok: false, error: "nombre_ausente" });
  });
});

describe("nombresCoinciden() — comparación por conjunto de tokens", () => {
  it("coincide exacto", () => {
    expect(nombresCoinciden("JUAN PEREZ SOTO", "JUAN PEREZ SOTO")).toBe(true);
  });

  it("coincide con orden invertido (apellidos primero vs nombres primero)", () => {
    expect(nombresCoinciden("CRISTIAN REVECO VASQUEZ", "REVECO VASQUEZ CRISTIAN")).toBe(true);
  });

  it("coincide ignorando acentos", () => {
    expect(nombresCoinciden("cristian vásquez", "CRISTIAN VASQUEZ")).toBe(true);
  });

  it("tolera un segundo nombre omitido (>=70%)", () => {
    expect(nombresCoinciden("JUAN PEREZ", "JUAN ALEJANDRO PEREZ SOTO")).toBe(true);
  });

  it("rechaza si el ingresado tiene menos de 2 tokens útiles", () => {
    expect(nombresCoinciden("JUAN", "JUAN PEREZ SOTO")).toBe(false);
  });

  it("rechaza nombres completamente distintos", () => {
    expect(nombresCoinciden("JUAN PEREZ", "MARIA GONZALEZ")).toBe(false);
  });
});

describe("verificarIdentidadCedula() — cross-check autoritativo", () => {
  const cedula = { rut: "11111111-1", nombre: "JUAN ALEJANDRO PÉREZ SOTO" };

  it("ok cuando RUT y nombre coinciden (formato de RUT distinto)", () => {
    const r = verificarIdentidadCedula(cedula, { rut: "11.111.111-1", nombre: "Juan Pérez Soto" });
    expect(r).toEqual({ rutCoincide: true, nombreCoincide: true, ok: true });
  });

  it("no ok si el RUT no coincide", () => {
    const r = verificarIdentidadCedula(cedula, { rut: "1-9", nombre: "Juan Pérez Soto" });
    expect(r.rutCoincide).toBe(false);
    expect(r.ok).toBe(false);
  });

  it("no ok si el nombre no coincide (misma persona tipeó otro nombre)", () => {
    const r = verificarIdentidadCedula(cedula, { rut: "11.111.111-1", nombre: "Pedro González" });
    expect(r.nombreCoincide).toBe(false);
    expect(r.ok).toBe(false);
  });
});
