/**
 * Tema visual Aurora — claro/oscuro, elegido por el usuario (no es solo
 * "seguir el sistema": es una preferencia explícita que se recuerda).
 */

export type HwTheme = "aurora-dark" | "aurora-light";

export const HW_THEME_STORAGE_KEY = "hw_theme";

export function isHwTheme(value: string | null): value is HwTheme {
  return value === "aurora-dark" || value === "aurora-light";
}

/**
 * Script que se inyecta inline (con nonce) ANTES de hidratar React, para que
 * <html data-theme="..."> quede correcto desde el primer paint — sin esto,
 * se vería un destello del tema contrario cada vez que se recarga la página.
 */
export const HW_THEME_INIT_SCRIPT = `
(function () {
  try {
    var KEY = "${HW_THEME_STORAGE_KEY}";
    var saved = localStorage.getItem(KEY);
    var theme = (saved === "aurora-light" || saved === "aurora-dark")
      ? saved
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
          ? "aurora-light"
          : "aurora-dark");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`.trim();
