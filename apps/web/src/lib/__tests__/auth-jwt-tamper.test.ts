import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifyToken, type SessionPayload } from "../auth";

// ROL-SEC-5 (plan de pruebas roles multiusuario) — decodificar el JWT de
// sesión, editar `rol` a "manager" y reinyectar sin volver a firmar debe
// ser rechazado por verifyToken(). signSession()/verifyToken() no llaman
// cookies() (a diferencia de getSession()/setSessionCookie()), así que se
// pueden ejercitar directamente fuera de un request de Next.
describe("JWT de sesión — resistencia a manipulación (ROL-SEC-5)", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "a".repeat(32);
  });

  const payloadColaborador: Omit<SessionPayload, "iat" | "exp"> = {
    sub: "usuario-id-colaborador",
    tenantId: "tenant-id-1",
    rol: "colaborador",
    nombre: "Test Colaborador",
    email: "colab@test.cl",
    perfilCompleto: true,
  };

  it("acepta un token válido sin modificar", async () => {
    const token = await signSession(payloadColaborador);
    const decoded = await verifyToken(token);
    expect(decoded?.rol).toBe("colaborador");
  });

  it("rechaza un token con el payload editado (rol -> manager) reutilizando la firma original", async () => {
    const token = await signSession(payloadColaborador);
    const [header, payloadB64, signature] = token.split(".");
    const payloadJson = JSON.parse(Buffer.from(payloadB64!, "base64url").toString("utf8"));
    payloadJson.rol = "manager";
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(payloadJson)).toString("base64url");
    const tamperedToken = `${header}.${tamperedPayloadB64}.${signature}`;

    const decoded = await verifyToken(tamperedToken);
    expect(decoded).toBeNull();
  });

  it("rechaza un token forjado desde cero con un secreto distinto de AUTH_SECRET", async () => {
    const { SignJWT } = await import("jose");
    const secretAjeno = new TextEncoder().encode("un-secreto-completamente-distinto-32b");
    const tokenForjado = await new SignJWT({ ...payloadColaborador, rol: "manager" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("8h")
      .sign(secretAjeno);

    const decoded = await verifyToken(tokenForjado);
    expect(decoded).toBeNull();
  });
});
