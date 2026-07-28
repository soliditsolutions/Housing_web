/**
 * Tests: getUfCLP — BL-DATA1
 *
 * Verifica el comportamiento de fail-fast en producción cuando la tabla
 * SerieUf no tiene datos, en lugar de retornar silenciosamente el fallback 37000.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSerieUfFindFirst = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    serieUf:    { findFirst: mockSerieUfFindFirst },
    periodoPago: { findMany: vi.fn() },
  },
}));

// Re-importa el módulo con el NODE_ENV correcto para que el check se evalúe en frío
async function importGetUfCLP() {
  vi.resetModules();
  const mod = await import("../queries");
  return mod.getUfCLP;
}

describe("getUfCLP — BL-DATA1 (fail-fast en producción)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
  });

  it("retorna el valor CLP numérico cuando hay datos en SerieUf", async () => {
    (process.env as Record<string, string>).NODE_ENV = "development";
    mockSerieUfFindFirst.mockResolvedValue({ valorClp: "37500.00" });
    const getUfCLP = await importGetUfCLP();
    await expect(getUfCLP(new Date("2026-06-01"))).resolves.toBe(37500);
  });

  it("retorna 37000 en desarrollo si SerieUf está vacía (fallback MVP)", async () => {
    (process.env as Record<string, string>).NODE_ENV = "development";
    mockSerieUfFindFirst.mockResolvedValue(null);
    const getUfCLP = await importGetUfCLP();
    await expect(getUfCLP(new Date("2026-06-01"))).resolves.toBe(37000);
  });

  it("lanza error en producción si SerieUf está vacía", async () => {
    (process.env as Record<string, string>).NODE_ENV = "production";
    mockSerieUfFindFirst.mockResolvedValue(null);
    const getUfCLP = await importGetUfCLP();
    await expect(getUfCLP(new Date("2026-06-01"))).rejects.toThrow(/SerieUf/i);
  });

  it("el error de producción menciona la fecha solicitada en el mensaje", async () => {
    (process.env as Record<string, string>).NODE_ENV = "production";
    mockSerieUfFindFirst.mockResolvedValue(null);
    const getUfCLP = await importGetUfCLP();
    await expect(getUfCLP(new Date("2026-06-01"))).rejects.toThrow(/getUfCLP/i);
  });
});
