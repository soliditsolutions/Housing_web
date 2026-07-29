/**
 * Tests: ownership de Contrato (ADR-0013, Fase D)
 *
 * `activarContrato` y `cancelarContratoBorrador` son representativas del
 * patrón compartido `verificarOwnershipContrato()` que usan las 6 Server
 * Actions de este módulo: un Colaborador solo puede actuar sobre contratos
 * cuya propiedad tiene asignada (`Propiedad.asignadoAId === actor.usuarioId`);
 * un Manager actúa sobre cualquier contrato del tenant sin restricción.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetActor = vi.fn();
vi.mock("@/lib/queries", () => ({ getActor: mockGetActor, getUfCLPTx: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logError: vi.fn() }));

const mockContratoFindFirst = vi.fn();
const mockContratoUpdate    = vi.fn().mockResolvedValue({});
const mockPropiedadUpdate   = vi.fn().mockResolvedValue({});
const mockNotificacionCreate = vi.fn().mockResolvedValue({});
const mockPeriodoUpdateMany  = vi.fn().mockResolvedValue({});

vi.mock("@/lib/db", () => {
  const models = {
    contrato:     { findFirst: mockContratoFindFirst, update: mockContratoUpdate },
    propiedad:    { update: mockPropiedadUpdate },
    notificacion: { create: mockNotificacionCreate },
    periodoPago:  { updateMany: mockPeriodoUpdateMany },
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

const { activarContrato, cancelarContratoBorrador } = await import("../actions");

describe("activarContrato — ownership (Fase D)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza si un Colaborador intenta activar un contrato de una propiedad que no tiene asignada", async () => {
    mockGetActor.mockResolvedValue({ usuarioId: "colab-x", tenantId: "tenant-abc", rol: "colaborador", tenant: { id: "tenant-abc" } });
    mockContratoFindFirst.mockResolvedValue({
      propiedadId: "prop-1", arrendatarioId: "pers-1",
      propiedad: { asignadoAId: "colab-1" },
    });

    const result = await activarContrato("contrato-1");

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/no tienes acceso/i) });
    expect(mockContratoUpdate).not.toHaveBeenCalled();
  });

  it("permite al Colaborador dueño de la propiedad activar su propio contrato", async () => {
    mockGetActor.mockResolvedValue({ usuarioId: "colab-1", tenantId: "tenant-abc", rol: "colaborador", tenant: { id: "tenant-abc" } });
    mockContratoFindFirst.mockResolvedValue({
      propiedadId: "prop-1", arrendatarioId: "pers-1",
      propiedad: { asignadoAId: "colab-1" },
    });

    const result = await activarContrato("contrato-1");

    expect(result).toEqual({ ok: true });
    expect(mockContratoUpdate).toHaveBeenCalled();
  });

  it("permite al Manager activar cualquier contrato del tenant", async () => {
    mockGetActor.mockResolvedValue({ usuarioId: "mgr-1", tenantId: "tenant-abc", rol: "manager", tenant: { id: "tenant-abc" } });
    mockContratoFindFirst.mockResolvedValue({
      propiedadId: "prop-1", arrendatarioId: "pers-1",
      propiedad: { asignadoAId: "colab-1" },
    });

    const result = await activarContrato("contrato-1");

    expect(result).toEqual({ ok: true });
    expect(mockContratoUpdate).toHaveBeenCalled();
  });
});

describe("cancelarContratoBorrador — ownership (Fase D)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rechaza si un Colaborador intenta cancelar el borrador de una propiedad ajena", async () => {
    mockGetActor.mockResolvedValue({ usuarioId: "colab-x", tenantId: "tenant-abc", rol: "colaborador", tenant: { id: "tenant-abc" } });
    mockContratoFindFirst.mockResolvedValue({
      propiedadId: "prop-1",
      propiedad: { asignadoAId: "colab-1" },
    });

    const result = await cancelarContratoBorrador("contrato-1");

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/no tienes acceso/i) });
    expect(mockContratoUpdate).not.toHaveBeenCalled();
  });

  it("permite al Colaborador dueño cancelar el borrador de su propia propiedad", async () => {
    mockGetActor.mockResolvedValue({ usuarioId: "colab-1", tenantId: "tenant-abc", rol: "colaborador", tenant: { id: "tenant-abc" } });
    mockContratoFindFirst.mockResolvedValue({
      propiedadId: "prop-1",
      propiedad: { asignadoAId: "colab-1" },
    });

    const result = await cancelarContratoBorrador("contrato-1");

    expect(result).toEqual({ ok: true });
    expect(mockContratoUpdate).toHaveBeenCalled();
  });
});
