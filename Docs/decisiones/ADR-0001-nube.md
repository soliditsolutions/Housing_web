# ADR-0001 — Decisión de nube: diferida, MVP portable

- **Fecha**: 2026-06-03
- **Estado**: Aceptada

## Contexto
Se planteó "cerrar la decisión de nube" (AWS vs. Azure) al inicio. Sin embargo, el MVP es local y simulado, y la elección de nube depende principalmente de la **experiencia del equipo**, que aún no está definida.

## Decisión
**Diferir la elección de nube.** Documentar la arquitectura objetivo de forma **portable** y construir el MVP sin SDKs propietarios (Docker + PostgreSQL estándar).

## Justificación
- Comprometer infraestructura ahora no aporta valor a un prototipo local y arriesga lock-in temprano.
- AWS y Azure cubren los requisitos por igual; ambos tienen región en Chile (relevante para residencia de datos y latencia).
- El factor decisivo real es la experiencia del equipo, dato aún no disponible.

## Consecuencias
- El núcleo y la app evitan dependencias propietarias.
- La decisión se retomará antes de la fase de despliegue, con criterio: experiencia del equipo > méritos técnicos (equivalentes).
- Riesgo controlado: si más adelante se requiere un servicio gestionado específico, se evaluará como ADR nuevo.
