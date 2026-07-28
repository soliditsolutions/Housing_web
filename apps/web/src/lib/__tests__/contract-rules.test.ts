/**
 * Tests del motor de reglas determinístico del contrato (ADR-0012, tarea #68).
 * Cubre cada regla del checklist legal (garantía art. 46, mora/usura, plazo,
 * multa, día de vencimiento, RUTs, coherencia) y la derivación de estado.
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
  multaMeses:       2,
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

describe("evaluarReglasContrato() — garantía (art. 46)", () => {
  it("garantía > 2 meses → crítica + requiere_revision", () => {
    const r = con({ garantiaMeses: 3 });
    expect(r.estado).toBe("requiere_revision");
    expect(r.alertas_criticas.some((a) => /art\. 46/.test(a))).toBe(true);
    expect(r.categorias.cumplimiento_legal.ok).toBe(false);
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

describe("evaluarReglasContrato() — multa", () => {
  it("sin multa → recomendación", () => {
    expect(con({ multaMeses: 0 }).recomendaciones.some((a) => /multa/i.test(a))).toBe(true);
  });

  it("multa > 3 meses → alerta de montos", () => {
    const r = con({ multaMeses: 4 });
    expect(r.categorias.montos.ok).toBe(false);
    expect(r.estado).toBe("con_alertas");
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
    const r = con({ garantiaMeses: 5, moraTasaPct: 3, arrendatarioRut: null, valorArriendo: 0 });
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
