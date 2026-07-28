/**
 * Tests: buscarOCrearPersona — BL-RC3
 *
 * Verifica que la función usa `upsert` en lugar de findFirst+create,
 * eliminando la race condition check-then-act cuando dos requests
 * concurrentes intentan crear la misma persona (mismo RUT+tenantId).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetTenant = vi.fn();
vi.mock("@/lib/queries", () => ({ getTenant: mockGetTenant }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const mockValidarRut = vi.fn();
vi.mock("@housing/core", () => ({
  validarRut: mockValidarRut,
  // formatearRut: requerido por la fachada @/lib/rut.ts (canonicalRut/formatRut
  // son alias sobre @housing/core) — sin este export el módulo lanza al cargar.
  formatearRut: vi.fn((r: string) => r),
  // Resto de exports que puedan importarse desde el módulo
  validarEmail: vi.fn(),
}));

const mockUpsert = vi.fn();
// buscarOCrearPersona corre dentro de withTenant() (ADR-0011): $transaction invoca
// el callback con un tx que expone $executeRaw (SET LOCAL) y los modelos. Se comparten
// las mismas instancias mock entre acceso directo y el tx.
vi.mock("@/lib/db", () => {
  const models = {
    persona:         { upsert: mockUpsert },
    propiedad:       { create: vi.fn(), update: vi.fn(), findFirstOrThrow: vi.fn(), findMany: vi.fn() },
    imagenPropiedad: { deleteMany: vi.fn(), createMany: vi.fn() },
  };
  return {
    prisma: {
      ...models,
      $transaction: vi.fn((cb: (tx: unknown) => unknown) =>
        cb({ $executeRaw: vi.fn().mockResolvedValue(undefined), ...models }),
      ),
    },
  };
});

const { buscarOCrearPersona } = await import("../actions");

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("buscarOCrearPersona — validación de entrada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna error cuando el nombre está vacío", async () => {
    const result = await buscarOCrearPersona({ nombre: "  ", rut: "11.111.111-1" });
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/nombre es obligatorio/i) });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("retorna error cuando el RUT está vacío", async () => {
    const result = await buscarOCrearPersona({ nombre: "Juan García", rut: "" });
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/rut es obligatorio/i) });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("retorna error cuando el RUT no es válido (dígito verificador incorrecto)", async () => {
    mockValidarRut.mockReturnValue(false);
    const result = await buscarOCrearPersona({ nombre: "Juan García", rut: "12.345.678-0" });
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/dígito verificador/i) });
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe("buscarOCrearPersona — BL-RC3 (upsert en lugar de findFirst+create)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenant.mockResolvedValue({ id: "tenant-abc" });
    mockValidarRut.mockReturnValue(true);
  });

  it("llama a prisma.persona.upsert (NO findFirst+create) para eliminar la race condition", async () => {
    mockUpsert.mockResolvedValue({ id: "persona-123" });

    await buscarOCrearPersona({ nombre: "Juan García", rut: "11.111.111-1" });

    expect(mockUpsert).toHaveBeenCalledTimes(1);
  });

  it("el upsert usa el compound unique tenantId_rut como where, con el RUT en forma canónica", async () => {
    mockUpsert.mockResolvedValue({ id: "persona-123" });

    await buscarOCrearPersona({ nombre: "Juan García", rut: "11.111.111-1" });

    // AUD-03/06: el RUT se guarda SIN puntos — debe coincidir con el formato
    // que usa el portal de autoconsulta (normalizarRut) al buscar por RUT.
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_rut: { tenantId: "tenant-abc", rut: "11111111-1" } },
      }),
    );
  });

  it("AUD-03/06 (regresión): un RUT ingresado con puntos se guarda canónico (sin puntos)", async () => {
    mockUpsert.mockResolvedValue({ id: "persona-nueva-999" });

    // Mismo RUT en dos formatos distintos — con puntos (como lo autoformatea
    // la UI) y sin puntos — deben producir exactamente el mismo valor
    // canónico, tanto en el "where" de búsqueda como en el "create".
    await buscarOCrearPersona({ nombre: "Pedro Arrendatario", rut: "15.111.222-6" });
    const llamadaConPuntos = mockUpsert.mock.calls[0][0];

    vi.clearAllMocks();
    mockGetTenant.mockResolvedValue({ id: "tenant-abc" });
    mockValidarRut.mockReturnValue(true);
    mockUpsert.mockResolvedValue({ id: "persona-nueva-999" });

    await buscarOCrearPersona({ nombre: "Pedro Arrendatario", rut: "15111222-6" });
    const llamadaSinPuntos = mockUpsert.mock.calls[0][0];

    expect(llamadaConPuntos.where.tenantId_rut.rut).toBe("15111222-6");
    expect(llamadaConPuntos.create.rut).toBe("15111222-6");
    expect(llamadaSinPuntos.where.tenantId_rut.rut).toBe("15111222-6");
    expect(llamadaConPuntos).toEqual(llamadaSinPuntos);
  });

  it("el upsert tiene update:{} para no sobreescribir datos existentes", async () => {
    mockUpsert.mockResolvedValue({ id: "persona-existente-456" });

    await buscarOCrearPersona({ nombre: "Juan García", rut: "11.111.111-1" });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: {} }),
    );
  });

  it("retorna el id de la persona (nueva o existente) que devuelve upsert", async () => {
    mockUpsert.mockResolvedValue({ id: "persona-existente-456" });

    const result = await buscarOCrearPersona({ nombre: "Juan García", rut: "11.111.111-1" });

    expect(result).toEqual({ ok: true, id: "persona-existente-456" });
  });

  it("propaga email y teléfono al bloque create del upsert", async () => {
    mockUpsert.mockResolvedValue({ id: "persona-nueva-789" });

    await buscarOCrearPersona({
      nombre: "María López", rut: "11.111.111-1",
      email: "maria@correo.cl", telefono: "+56912345678",
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          email: "maria@correo.cl",
          telefono: "+56912345678",
        }),
      }),
    );
  });

  it("retorna error genérico si el upsert lanza (ej. violación de constraint inesperada)", async () => {
    mockUpsert.mockRejectedValue(new Error("DB error"));

    const result = await buscarOCrearPersona({ nombre: "Juan García", rut: "11.111.111-1" });

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/intenta nuevamente/i) });
  });
});
