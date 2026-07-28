"use client";

import { useEffect } from "react";
import { scrollToSection } from "./PublicNavLinks";
import { getWalkthroughLayoutMode, subscribeWalkthroughLayoutMode } from "./ScrollWalkthrough";

/**
 * Cubre el caso que PublicNavLink no puede: llegar a "/#<ancla>" (acerca-de,
 * destacado, planes) desde OTRA página. Ahí sí cambia el pathname, así que
 * Next.js hace la transición normal, pero no hace scroll al id (solo
 * garantiza que la página sea visible) — sin esto, el usuario aterriza
 * arriba del home en vez de en la sección.
 *
 * El escenario walkthrough decide de forma ASÍNCRONA (tras hidratar) si
 * queda fijado (desktop) o apilado (mobile/reduced-motion) — recién ahí
 * existe el marcador de ancla correcto en el lugar correcto (ver
 * `getWalkthroughLayoutMode` en ScrollWalkthrough.tsx). Antes solía haber un
 * `setTimeout` fijo de 120ms apostando a que esa decisión ya estuviera
 * lista — pero es una carrera: en hidrataciones lentas (dev, CPU/red
 * lentas) los 120ms pueden ganarle a la decisión real, y el scroll
 * encuentra el marcador equivocado (o ninguno) y el usuario queda tirado
 * arriba del todo. Acá se espera la señal real en vez de adivinar cuánto
 * tarda, con un tope de seguridad por si nunca llegara a resolverse.
 *
 * También fija `history.scrollRestoration = "manual"` y escucha `popstate`:
 * por defecto el navegador intenta restaurar el scroll al navegar con
 * atrás/adelante, pero cuando el hash cambia via `history.pushState` manual
 * (ver PublicNavLink) — no una navegación real de Next — esa restauración
 * automática puede fallar. Caso concreto: Home → click "Nuestros Planes"
 * (pushState a "/#planes", sin remount) → navegar a otra página → atrás
 * dos veces. El primer "atrás" vuelve a "/#planes" (remonta Home, este
 * efecto corre de nuevo, hace scroll a la sección — correcto). El segundo
 * "atrás" vuelve a "/" sin hash, pero como el pathname no cambió respecto a
 * "/#planes", Home NO remonta — sin un listener de `popstate`, nada vuelve
 * a decidir el scroll y la página queda donde estaba (a media altura, junto
 * a la ancla) en vez de arriba. Tomando control manual: sin hash → siempre
 * arriba; con una ancla → siempre esa sección. Nunca "lo que el navegador
 * recuerde".
 */
export function HomeHashHandler() {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    function aplicarScrollSegunHash() {
      const hash = window.location.hash;
      if (hash.length > 1) {
        scrollToSection(hash.slice(1));
      } else {
        window.scrollTo(0, 0);
      }
    }

    // Al volver con atrás/adelante el modo del escenario ya está resuelto
    // hace rato — ahí sí alcanza con reaccionar directo, sin esperar nada.
    window.addEventListener("popstate", aplicarScrollSegunHash);

    const hash = window.location.hash;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let safetyTimer = 0;

    if (hash.length > 1) {
      function irCuandoElModoEsteListo() {
        // Un par de rAF de margen tras conocer el modo: la propia señal se
        // dispara desde dentro de un rAF (ver ScrollWalkthrough), así que el
        // cambio de estado de React (el marcador de ancla entrando al DOM)
        // recién se confirma en el/los siguientes frames.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (!cancelled) aplicarScrollSegunHash();
          }),
        );
      }

      if (getWalkthroughLayoutMode() !== null) {
        irCuandoElModoEsteListo();
      } else {
        unsubscribe = subscribeWalkthroughLayoutMode(() => {
          unsubscribe?.();
          unsubscribe = null;
          window.clearTimeout(safetyTimer);
          irCuandoElModoEsteListo();
        });
        // Red de seguridad: si por lo que sea el modo nunca llega a
        // resolverse, no dejamos al usuario colgado arriba de la página para
        // siempre — se intenta igual con lo que haya en el DOM en ese momento.
        // El plazo es generoso a propósito: la decisión SIEMPRE debería
        // llegar en milisegundos (rAF dentro de un useLayoutEffect de mount),
        // pero en hidrataciones realmente lentas se midió que puede tardar
        // varios segundos — preferible esperar de más a arriesgarse a
        // aterrizar en el marcador equivocado adivinando un plazo corto.
        safetyTimer = window.setTimeout(() => {
          unsubscribe?.();
          unsubscribe = null;
          if (!cancelled) aplicarScrollSegunHash();
        }, 12000);
      }
    } else {
      window.scrollTo(0, 0);
    }

    return () => {
      cancelled = true;
      unsubscribe?.();
      window.clearTimeout(safetyTimer);
      window.removeEventListener("popstate", aplicarScrollSegunHash);
    };
  }, []);

  return null;
}
