import { vi } from "vitest";
import "@testing-library/jest-dom";

// jsdom no implementa scrollIntoView; se usa en registro-form para scroll al primer error
if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}
