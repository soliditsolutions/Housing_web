// @vitest-environment jsdom
/**
 * Tests: RegistroForm
 * — aria-invalid + aria-describedby en todos los campos (UI-C2)
 * — aria-live="polite" en PasswordStrengthMeter (UI-C5)
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

const mockUseActionState = vi.hoisted(() => vi.fn());

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useActionState: mockUseActionState };
});

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../actions", () => ({ registroAction: vi.fn() }));

const { RegistroForm } = await import("../registro-form");

const NO_ERROR = [null, vi.fn(), false] as const;

function clickSubmit() {
  fireEvent.click(screen.getByRole("button", { name: /crear cuenta gratuita/i }));
}

describe("RegistroForm — estado inicial (sin errores)", () => {
  beforeEach(() => {
    mockUseActionState.mockReturnValue([...NO_ERROR]);
  });

  it("renderiza los cinco campos requeridos", () => {
    render(<RegistroForm />);
    expect(screen.getByLabelText("Nombre completo")).toBeInTheDocument();
    expect(screen.getByLabelText("RUT")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre de la corredora")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
  });

  it("ningún input de texto tiene aria-invalid inicialmente", () => {
    render(<RegistroForm />);
    screen.getAllByRole("textbox").forEach((input) =>
      expect(input).not.toHaveAttribute("aria-invalid"),
    );
  });

  it("no hay mensajes role='alert' inicialmente", () => {
    render(<RegistroForm />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("RegistroForm — errores de validación cliente (UI-C2)", () => {
  beforeEach(() => {
    mockUseActionState.mockReturnValue([...NO_ERROR]);
  });

  it("nombre tiene aria-invalid=true tras submit vacío", () => {
    render(<RegistroForm />);
    clickSubmit();
    expect(screen.getByLabelText("Nombre completo")).toHaveAttribute("aria-invalid", "true");
  });

  it("#nombre-error existe con role='alert' tras submit vacío", () => {
    render(<RegistroForm />);
    clickSubmit();
    const el = document.getElementById("nombre-error");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("role", "alert");
  });

  it("nombre tiene aria-describedby='nombre-error' cuando hay error", () => {
    render(<RegistroForm />);
    clickSubmit();
    expect(screen.getByLabelText("Nombre completo"))
      .toHaveAttribute("aria-describedby", "nombre-error");
  });

  it("email tiene aria-invalid=true tras submit vacío", () => {
    render(<RegistroForm />);
    clickSubmit();
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("aria-invalid", "true");
  });

  it("#email-error existe con role='alert'", () => {
    render(<RegistroForm />);
    clickSubmit();
    expect(document.getElementById("email-error")).toHaveAttribute("role", "alert");
  });

  it("email tiene aria-describedby='email-error'", () => {
    render(<RegistroForm />);
    clickSubmit();
    expect(screen.getByLabelText("Correo electrónico"))
      .toHaveAttribute("aria-describedby", "email-error");
  });

  it("empresa tiene aria-invalid=true tras submit vacío", () => {
    render(<RegistroForm />);
    clickSubmit();
    expect(screen.getByLabelText("Nombre de la corredora"))
      .toHaveAttribute("aria-invalid", "true");
  });

  it("#empresa-error existe con role='alert'", () => {
    render(<RegistroForm />);
    clickSubmit();
    expect(document.getElementById("empresa-error")).toHaveAttribute("role", "alert");
  });

  it("contraseña tiene aria-invalid=true tras submit vacío", () => {
    render(<RegistroForm />);
    clickSubmit();
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("aria-invalid", "true");
  });

  it("#password-error existe con role='alert'", () => {
    render(<RegistroForm />);
    clickSubmit();
    expect(document.getElementById("password-error")).toHaveAttribute("role", "alert");
  });

  it("consent tiene aria-invalid=true tras submit vacío", () => {
    render(<RegistroForm />);
    clickSubmit();
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("#consent-error existe con role='alert'", () => {
    render(<RegistroForm />);
    clickSubmit();
    expect(document.getElementById("consent-error")).toHaveAttribute("role", "alert");
  });

  it("aparecen al menos 5 alertas simultáneas (una por campo con error)", () => {
    render(<RegistroForm />);
    clickSubmit();
    expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(5);
  });
});

describe("RegistroForm — errores de servidor (UI-C2)", () => {
  it("con error server field='email', email tiene aria-invalid=true", () => {
    mockUseActionState.mockReturnValue([
      { error: "Este correo ya está registrado.", field: "email" },
      vi.fn(),
      false,
    ]);
    render(<RegistroForm />);
    expect(screen.getByLabelText("Correo electrónico")).toHaveAttribute("aria-invalid", "true");
  });

  it("con error server field='nombre', nombre tiene aria-invalid=true", () => {
    mockUseActionState.mockReturnValue([
      { error: "Nombre inválido.", field: "nombre" },
      vi.fn(),
      false,
    ]);
    render(<RegistroForm />);
    expect(screen.getByLabelText("Nombre completo")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("RegistroForm — aria-live en medidor de contraseña (UI-C5)", () => {
  beforeEach(() => {
    mockUseActionState.mockReturnValue([...NO_ERROR]);
  });

  it("existe contenedor aria-live='polite' para el medidor de fuerza", () => {
    const { container } = render(<RegistroForm />);
    expect(container.querySelector("[aria-live='polite']")).toBeInTheDocument();
  });

  it("el contenedor aria-live tiene aria-atomic='true'", () => {
    const { container } = render(<RegistroForm />);
    expect(container.querySelector("[aria-live='polite']"))
      .toHaveAttribute("aria-atomic", "true");
  });
});

describe("RegistroForm — aria-describedby al hint cuando no hay error", () => {
  beforeEach(() => {
    mockUseActionState.mockReturnValue([...NO_ERROR]);
  });

  it("nombre apunta a nombre-hint cuando no hay error", () => {
    render(<RegistroForm />);
    expect(screen.getByLabelText("Nombre completo"))
      .toHaveAttribute("aria-describedby", "nombre-hint");
  });

  it("nombre-hint contiene texto sobre la cédula de identidad", () => {
    render(<RegistroForm />);
    expect(document.getElementById("nombre-hint")).toHaveTextContent(/cédula de identidad/i);
  });
});
