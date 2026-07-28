import { describe, it, expect } from "vitest";
import { getClientIpFromHeaders } from "../ip";

/** Simula el tipo ReadonlyHeaders con un Map simple */
function makeHeaders(obj: Record<string, string>) {
  return { get: (name: string) => obj[name] ?? null };
}

describe("getClientIpFromHeaders() — IP resolution (Fix M2)", () => {
  it("prefiere x-real-ip sobre x-forwarded-for", () => {
    const h = makeHeaders({
      "x-real-ip":       "1.2.3.4",
      "x-forwarded-for": "9.9.9.9, 8.8.8.8",
    });
    expect(getClientIpFromHeaders(h as never)).toBe("1.2.3.4");
  });

  it("toma el ÚLTIMO hop de x-forwarded-for (proxy más cercano)", () => {
    const h = makeHeaders({
      "x-forwarded-for": "203.0.113.1, 10.0.0.1, 192.168.1.1",
    });
    expect(getClientIpFromHeaders(h as never)).toBe("192.168.1.1");
  });

  it("no toma el PRIMER hop (manipulable por el cliente)", () => {
    const h = makeHeaders({
      "x-forwarded-for": "1.3.3.7, 192.168.0.1",
    });
    expect(getClientIpFromHeaders(h as never)).not.toBe("1.3.3.7");
    expect(getClientIpFromHeaders(h as never)).toBe("192.168.0.1");
  });

  it("maneja x-forwarded-for con un solo valor", () => {
    const h = makeHeaders({ "x-forwarded-for": "5.5.5.5" });
    expect(getClientIpFromHeaders(h as never)).toBe("5.5.5.5");
  });

  it("hace trim de espacios en la IP", () => {
    const h = makeHeaders({ "x-real-ip": "  1.2.3.4  " });
    expect(getClientIpFromHeaders(h as never)).toBe("1.2.3.4");
  });

  it("retorna 127.0.0.1 cuando no hay headers", () => {
    const h = makeHeaders({});
    expect(getClientIpFromHeaders(h as never)).toBe("127.0.0.1");
  });

  it("retorna 127.0.0.1 con x-forwarded-for vacío", () => {
    const h = makeHeaders({ "x-forwarded-for": "" });
    expect(getClientIpFromHeaders(h as never)).toBe("127.0.0.1");
  });

  it("previene bypass del rate limit via header forjado (primer hop)", () => {
    // Un atacante pone su IP falsa como primer hop; el proxy real añade la real al final.
    // La función debe retornar la IP real (último hop), no la falsa (primer hop).
    const h = makeHeaders({
      "x-forwarded-for": "attacker-ip, real-proxy-ip",
    });
    expect(getClientIpFromHeaders(h as never)).toBe("real-proxy-ip");
  });
});
