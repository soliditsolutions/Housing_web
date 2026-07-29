// @vitest-environment jsdom
/**
 * Tests: Nav — orden primario/secundario y aria-label en modo colapsado (UI-C6)
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { Nav } from "../nav";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    "aria-label":   ariaLabel,
    "aria-current": ariaCurrent,
    ...rest
  }: {
    href: string;
    children?: React.ReactNode;
    "aria-label"?:   string;
    "aria-current"?: "page" | "step" | "location" | "date" | "time" | boolean;
    [k: string]: unknown;
  }) => (
    <a href={href} aria-label={ariaLabel} aria-current={ariaCurrent} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/panel",
}));

const PRIMARY_LABELS   = ["Resumen", "Propiedades", "Contratos", "Cobros", "Estadísticas", "Vouchers", "Notificaciones"];
const SECONDARY_LABELS = ["Ir al inicio", "Mi perfil"];

// Helper: texto visible o aria-label del elemento
function textOrLabel(el: Element): string {
  return el.getAttribute("aria-label") ?? el.textContent ?? "";
}

describe("Nav — orden DOM (UI-C6)", () => {
  it("los ítems primarios aparecen antes que los secundarios en el DOM", () => {
    const { container } = render(<Nav />);
    const links = Array.from(container.querySelectorAll("a"));
    const labels = links.map(textOrLabel);

    const primerPrimario   = labels.findIndex((t) => t.includes("Resumen"));
    const primerSecundario = labels.findIndex((t) => t.includes("Ir al inicio"));

    expect(primerPrimario).toBeGreaterThanOrEqual(0);
    expect(primerSecundario).toBeGreaterThanOrEqual(0);
    expect(primerPrimario).toBeLessThan(primerSecundario);
  });

  it("todos los ítems primarios preceden a todos los ítems secundarios", () => {
    const { container } = render(<Nav />);
    const links  = Array.from(container.querySelectorAll("a"));
    const labels = links.map(textOrLabel);

    const lastPrimary    = Math.max(...PRIMARY_LABELS.map(   (l) => labels.findIndex((t) => t.includes(l))));
    const firstSecondary = Math.min(...SECONDARY_LABELS.map((l) => labels.findIndex((t) => t.includes(l))));

    expect(lastPrimary).toBeLessThan(firstSecondary);
  });
});

describe("Nav — aria-label en modo colapsado (UI-C6)", () => {
  it("con collapsed=false los links de navegación NO tienen aria-label", () => {
    render(<Nav collapsed={false} />);
    const resumenEl = screen.getByText("Resumen").closest("a");
    expect(resumenEl).not.toHaveAttribute("aria-label");
  });

  it("con collapsed=true cada link tiene aria-label con su etiqueta", () => {
    const { container } = render(<Nav collapsed={true} />);
    const linksConAriaLabel = Array.from(container.querySelectorAll("a[aria-label]"));
    expect(linksConAriaLabel.length).toBe(PRIMARY_LABELS.length + SECONDARY_LABELS.length);
  });

  it("con collapsed=true el link de Resumen tiene aria-label='Resumen'", () => {
    const { container } = render(<Nav collapsed={true} />);
    expect(container.querySelector('[aria-label="Resumen"]')).toBeInTheDocument();
  });

  it("con collapsed=true el link de Propiedades tiene aria-label='Propiedades'", () => {
    const { container } = render(<Nav collapsed={true} />);
    expect(container.querySelector('[aria-label="Propiedades"]')).toBeInTheDocument();
  });

  it("con collapsed=true el link de Mi perfil tiene aria-label='Mi perfil'", () => {
    const { container } = render(<Nav collapsed={true} />);
    expect(container.querySelector('[aria-label="Mi perfil"]')).toBeInTheDocument();
  });
});

describe("Nav — ítem Equipo solo para manager (ADR-0013)", () => {
  it("sin isManager, el link de Equipo NO aparece", () => {
    render(<Nav />);
    expect(screen.queryByText("Equipo")).not.toBeInTheDocument();
  });

  it("con isManager=true, el link de Equipo aparece entre Ir al inicio y Mi perfil", () => {
    const { container } = render(<Nav isManager={true} />);
    const labels = Array.from(container.querySelectorAll("a")).map(textOrLabel);
    const iInicio = labels.findIndex((t) => t.includes("Ir al inicio"));
    const iEquipo = labels.findIndex((t) => t.includes("Equipo"));
    const iPerfil = labels.findIndex((t) => t.includes("Mi perfil"));
    expect(iEquipo).toBeGreaterThan(iInicio);
    expect(iEquipo).toBeLessThan(iPerfil);
  });
});

describe("Nav — aria-current en ítem activo", () => {
  it("el ítem activo (Resumen en /panel) tiene aria-current='page'", () => {
    render(<Nav />);
    const resumenLink = screen.getByText("Resumen").closest("a");
    expect(resumenLink).toHaveAttribute("aria-current", "page");
  });

  it("los ítems inactivos no tienen aria-current", () => {
    render(<Nav />);
    const propLink = screen.getByText("Propiedades").closest("a");
    expect(propLink).not.toHaveAttribute("aria-current");
  });
});
