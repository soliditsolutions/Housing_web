/**
 * Tests del motor de reglas determinístico del contrato (ADR-0012, tarea #68).
 * Cubre cada regla del checklist legal (garantía, mora/usura, plazo, día de
 * vencimiento, RUTs, coherencia) y la derivación de estado.
 *
 * Revisión legal 2026-07-30: la garantía ya NO se valida contra un tope legal
 * inexistente ("art. 46 Ley 18.101" no existe — la ley tiene 27 artículos y no
 * regula el monto de la garantía hoy). Superar 1-2 meses ahora es solo una
 * recomendación de práctica de mercado, nunca una crítica. El campo multaMeses
 * fue eliminado del todo (no correspondía a ninguna cláusula real).
 */
import { describe, it, expect } from "vitest";
import { evaluarReglasContrato, type DatosContratoReglas } from "../contract-rules";

// Contrato base VÁLIDO — RUTs con DV mod-11 correcto (no son personas reales).
const BASE: DatosContratoReglas = {
  propietarioRut:   "11.111.111-1",
  arrendatarioRut:  "1-9",
  valorArriendo:    450000,
  denominacion:     "CLP",
  diaVencimiento:   5,
  garantiaMeses:    1,
  garantiaMontoCLP: 450000,
  moraTasaPct:      1,
  moraDiasGracia:   7,
  fechaInicio:      new Date("2026-01-01"),
  fechaFin:         new Date("2027-01-01"),
};

const con = (over: Partial<DatosContratoReglas>) => evaluarReglasContrato({ ...BASE, ...over });

describe("evaluarReglasContrato() — caso aprobado", () => {
  it("un contrato correcto queda 'aprobado' sin alertas ni críticas", () => {
    const r = con({});
    expect(r.estado).toBe("aprobado");
    expect(r.alertas_criticas).toEqual([]);
    expect(r.recomendaciones).toEqual([]);
    expect(Object.values(r.categorias).every((c) => c.ok)).toBe(true);
  });
});

describe("evaluarReglasContrato() — garantía (sin tope legal vigente)", () => {
  it("garantía > 2 meses → solo recomendación, nunca crítica ni cita un artículo inexistente", () => {
    const r = con({ garantiaMeses: 3 });
    expect(r.estado).toBe("con_alertas");
    expect(r.alertas_criticas).toEqual([]);
    expect(r.categorias.cumplimiento_legal.ok).toBe(true);
    expect(r.recomendaciones.some((a) => /práctica de mercado/i.test(a))).toBe(true);
    expect(r.recomendaciones.some((a) => /art\. 46|artículo 46/i.test(a))).toBe(false);
  });

  it("sin garantía → recomendación (no crítica)", () => {
    const r = con({ garantiaMeses: 0, garantiaMontoCLP: 0 });
    expect(r.estado).toBe("con_alertas");
    expect(r.alertas_criticas).toEqual([]);
    expect(r.recomendaciones.some((a) => /garantía/i.test(a))).toBe(true);
  });

  it("garantía exactamente 2 meses es válida", () => {
    expect(con({ garantiaMeses: 2 }).categorias.cumplimiento_legal.ok).toBe(true);
  });
});

describe("evaluarReglasContrato() — mora", () => {
  it("tasa > 1.5% → crítica (usura)", () => {
    const r = con({ moraTasaPct: 2 });
    expect(r.estado).toBe("requiere_revision");
    expect(r.alertas_criticas.some((a) => /usura|1\.5/.test(a))).toBe(true);
  });

  it("días de gracia fuera de 5–10 → recomendación", () => {
    const r = con({ moraDiasGracia: 15 });
    expect(r.recomendaciones.some((a) => /días de gracia/i.test(a))).toBe(true);
    expect(r.alertas_criticas).toEqual([]);
  });
});

describe("evaluarReglasContrato() — plazo y coherencia", () => {
  it("plazo indefinido (sin fechaFin) → recomendación", () => {
    const r = con({ fechaFin: null });
    expect(r.estado).toBe("con_alertas");
    expect(r.recomendaciones.some((a) => /indefinido/i.test(a))).toBe(true);
  });

  it("fechaFin <= fechaInicio → crítica de coherencia", () => {
    const r = con({ fechaInicio: new Date("2026-06-01"), fechaFin: new Date("2026-01-01") });
    expect(r.estado).toBe("requiere_revision");
    expect(r.categorias.estructura.ok).toBe(false);
    expect(r.alertas_criticas.some((a) => /término|inicio/i.test(a))).toBe(true);
  });
});

describe("evaluarReglasContrato() — día de vencimiento", () => {
  it("día > 28 → alerta de estructura (no crítica)", () => {
    const r = con({ diaVencimiento: 31 });
    expect(r.estado).toBe("con_alertas");
    expect(r.categorias.estructura.ok).toBe(false);
    expect(r.alertas_criticas).toEqual([]);
  });

  it("día 28 es válido", () => {
    expect(con({ diaVencimiento: 28 }).categorias.estructura.ok).toBe(true);
  });
});

describe("evaluarReglasContrato() — información de las partes (RUTs)", () => {
  it("RUT faltante → crítica", () => {
    const r = con({ arrendatarioRut: null });
    expect(r.estado).toBe("requiere_revision");
    expect(r.categorias.informacion_partes.ok).toBe(false);
    expect(r.alertas_criticas.some((a) => /RUT del arrendatario/.test(a))).toBe(true);
  });

  it("RUT con DV inválido → crítica", () => {
    const r = con({ propietarioRut: "11.111.111-9" }); // DV correcto es 1
    expect(r.alertas_criticas.some((a) => /dígito verificador/i.test(a))).toBe(true);
  });
});

describe("evaluarReglasContrato() — renta", () => {
  it("renta 0 → crítica de montos", () => {
    const r = con({ valorArriendo: 0 });
    expect(r.estado).toBe("requiere_revision");
    expect(r.categorias.montos.ok).toBe(false);
  });
});

describe("evaluarReglasContrato() — derivación de estado y forma de salida", () => {
  it("solo recomendaciones (sin alertas de categoría) → con_alertas", () => {
    const r = con({ moraDiasGracia: 20 }); // recomendación pura
    expect(r.estado).toBe("con_alertas");
  });

  it("acumula múltiples críticas", () => {
    const r = con({
      moraTasaPct: 3, arrendatarioRut: null, valorArriendo: 0,
      fechaInicio: new Date("2026-06-01"), fechaFin: new Date("2026-01-01"),
    });
    expect(r.estado).toBe("requiere_revision");
    expect(r.alertas_criticas.length).toBeGreaterThanOrEqual(4);
  });

  it("respeta el shape de ValidacionResultado (categorías fijas)", () => {
    const r = con({});
    expect(Object.keys(r.categorias).sort()).toEqual(
      ["cumplimiento_legal", "estructura", "informacion_partes", "montos"],
    );
    expect(typeof r.resumen).toBe("string");
  });
});
