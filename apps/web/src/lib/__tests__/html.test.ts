import { describe, it, expect } from "vitest";
import { esc } from "../html";

describe("esc() — HTML escaping (Fix A1)", () => {
  it("escapa & a &amp;", () => {
    expect(esc("a & b")).toBe("a &amp; b");
  });

  it("escapa < a &lt;", () => {
    expect(esc("<script>")).toBe("&lt;script&gt;");
  });

  it("escapa > a &gt;", () => {
    expect(esc("a > b")).toBe("a &gt; b");
  });

  it('escapa " a &quot;', () => {
    expect(esc('"hola"')).toBe("&quot;hola&quot;");
  });

  it("escapa ' a &#x27;", () => {
    expect(esc("it's")).toBe("it&#x27;s");
  });

  it("escapa todos los caracteres especiales en una cadena combinada", () => {
    expect(esc('<a href="x" onclick=\'alert(1)\'>x&y</a>')).toBe(
      "&lt;a href=&quot;x&quot; onclick=&#x27;alert(1)&#x27;&gt;x&amp;y&lt;/a&gt;",
    );
  });

  it("retorna cadena vacía para null", () => {
    expect(esc(null)).toBe("");
  });

  it("retorna cadena vacía para undefined", () => {
    expect(esc(undefined)).toBe("");
  });

  it("retorna cadena vacía para cadena vacía", () => {
    expect(esc("")).toBe("");
  });

  it("no modifica texto sin caracteres especiales", () => {
    expect(esc("Nombre Apellido 123")).toBe("Nombre Apellido 123");
  });

  it("previene XSS reflejado clásico", () => {
    const payload = '<img src=x onerror=alert(document.cookie)>';
    expect(esc(payload)).not.toContain("<img");
    expect(esc(payload)).toContain("&lt;img");
  });
});
