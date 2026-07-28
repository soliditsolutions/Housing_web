/**
 * Tests: marcarPeriodosAtrasados — AUD-09
 *
 * Regla 11 del modelo de dominio: "atrasado si vence sin pago". Antes de este
 * fix, ningún código escribía nunca `estado: "atrasado"` — los períodos
 * quedaban en `pendiente` para siempre aunque su fecha de vencimiento
 * pasara, haciéndolos invisibles en Cobros/Dashboard e imposibles de
 * conciliar (la compuerta atómica de `simularPago` exige `estado: "atrasado"`).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpdateMany = vi.fn();

// marcarPeriodosAtrasados ahora corre dentro de withTenant() (ADR-0011): una
// transacción interactiva que setea app.current_tenant_id y ejecuta las queries
// sobre el `tx`. El mock replica ese patrón: $transaction invoca el callback con
// un tx que expone $executeRaw (SET LOCAL) y periodoPago.updateMany.
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn((cb: (tx: unknown) => unknown) =>
      cb({
        $executeRaw: vi.fn().mockResolvedValue(undefined),
        periodoPago: { updateMany: mockUpdateMany },
      }),
    ),
  },
}));

const { marcarPeriodosAtrasados } = await import("../queries");

describe("marcarPeriodosAtrasados — AUD-09", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMany.mockResolvedValue({ count: 0 });
  });

  it("actualiza solo períodos 'pendiente' del tenant con vencimiento anterior a hoy", async () => {
    await marcarPeriodosAtrasados("tenant-abc");

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-abc",
        estado: "pendiente",
        fechaVencimiento: { lt: expect.any(Date) },
      },
      data: { estado: "atrasado" },
    });
  });

  it("nunca toca períodos que no estén en 'pendiente' (pagado/liquidado/en_revision quedan intactos)", async () => {
    await marcarPeriodosAtrasados("tenant-abc");

    const where = mockUpdateMany.mock.calls[0][0].where;
    expect(where.estado).toBe("pendiente");
  });

  it("está aislado por tenantId (no puede promover períodos de otro tenant)", async () => {
    await marcarPeriodosAtrasados("tenant-xyz");

    const where = mockUpdateMany.mock.calls[0][0].where;
    expect(where.tenantId).toBe("tenant-xyz");
  });

  it("el corte de fecha es medianoche UTC del día actual (sin componente de hora)", async () => {
    await marcarPeriodosAtrasados("tenant-abc");

    const fechaCorte: Date = mockUpdateMany.mock.calls[0][0].where.fechaVencimiento.lt;
    expect(fechaCorte.getUTCHours()).toBe(0);
    expect(fechaCorte.getUTCMinutes()).toBe(0);
    expect(fechaCorte.getUTCSeconds()).toBe(0);
    expect(fechaCorte.getUTCMilliseconds()).toBe(0);
  });
});
