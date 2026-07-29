# Plan de pruebas — Cuentas multi-usuario (Manager / Collaborator)

> Vara de aceptación para las Fases A-E del diseño aprobado ([plan de implementación](../../../.claude/plans/sparkling-booping-moler.md) — o su copia si ya se movió/archivó). **Nada de esto está implementado todavía**: este documento define qué hay que probar en cada fase antes de darla por cerrada, no un reporte de pruebas ya corridas. Mismo formato que [plan-de-pruebas-qa.md](plan-de-pruebas-qa.md): **ID · escenario · resultado esperado**, prioridad 🔴/🟡/🟢.

## 0. Alcance confirmado (no re-litigar sin volver a modo plan)

Decisiones tomadas el 2026-07-27 al recalibrar el plan de pruebas original (que asumía un modelo más grande del que se aprobó):

| Decisión | Implica |
|---|---|
| **Rol binario**, sin matriz de permisos granular | No hay pruebas de "quitar Edición de Pagos pero dejar Lectura" — el Collaborator tiene acceso total (lectura+escritura) a lo que le está asignado, o nada de lo que no. |
| **1 Collaborator = 1 Manager fijo** | No hay pruebas de "espacio de trabajo"/cambio de cuenta — un Usuario pertenece a un solo Tenant, igual que hoy. |
| **Invalidación en el siguiente request**, no instantánea | El JWT es stateless (TTL 8h); no hay WebSockets ni sesiones con estado. Las pruebas de revocación validan "la próxima acción falla", no "la sesión muere al instante en otra pestaña abierta". |
| **WebPay fuera de alcance** | Enmascaramiento de tokens de pasarela, endpoints de configuración de pagos: quedan para el plan de pruebas de la fase de pagos, cuando esa integración se diseñe. |

---

## 1. Ciberseguridad (aislamiento multi-tenant e intra-cuenta)

| ID | Escenario | Resultado esperado | Pri |
|---|---|---|---|
| ROL-SEC-1 | Cross-tenant IDOR: un Usuario del Tenant A cambia el id en la URL de una propiedad/contrato del Tenant B (`/panel/propiedades/<id-de-otro-tenant>`) | 404/no encontrado — el `tenantId` de la sesión nunca deja de filtrar, ni para el Manager | 🔴 |
| ROL-SEC-2 | IDOR intra-cuenta: un Collaborator cambia el id en la URL a una propiedad del **mismo tenant** pero NO asignada a él | 404/no encontrado (o mensaje "no tienes acceso"), no el detalle de la propiedad | 🔴 |
| ROL-SEC-3 | Escalada de privilegio: un Collaborator invoca directamente (Postman/`fetch` desde devtools, sin pasar por la UI) una Server Action Manager-only — `invitarColaborador`, `desactivarColaborador`, el `asignadoAId` del editor de propiedad | Rechazo server-side (`DomainError`) verificado **dentro** de la transacción — el botón oculto en la UI no es la única defensa | 🔴 |
| ROL-SEC-4 | Bypass de frontend: deshabilitar JavaScript o pegar el `curl`/POST equivalente de una acción restringida | Mismo resultado que ROL-SEC-3 — la autorización no depende de que el cliente coopere | 🔴 |
| ROL-SEC-5 | Manipulación de JWT: decodificar el token de sesión de un Collaborator, editar `rol` a `"manager"`, reinyectar la cookie sin volver a firmar | `verifyToken()` rechaza la firma inválida — sesión inválida, redirige a login. ✅ **Verificado 2026-07-28** (Fase A) vía `src/lib/__tests__/auth-jwt-tamper.test.ts` — payload editado con firma reutilizada y token forjado con secreto ajeno, ambos rechazados. Mismo mecanismo que usará la sesión real de un Collaborator (Fase B). | 🔴 |
| ROL-SEC-6 | Reutilización de token de invitación: aceptar el mismo link de invitación dos veces | Segunda vez falla (`usadoEn` ya marcado) | 🔴 |
| ROL-SEC-7 | Invitación vencida (después del TTL de 7 días) | Falla con mensaje claro, no crea el Usuario | 🟡 |
| ROL-SEC-8 | Intento de inyectar `rol: "manager"` en el payload del formulario de aceptación de invitación | Ignorado — la acción del servidor asigna `rol: "colaborador"` de forma fija, nunca lee un campo de rol del formulario | 🔴 |
| ROL-SEC-9 | Sesión post-desactivación: el Manager desactiva a un Collaborator que tiene la app abierta en otra pestaña; ese Collaborator hace clic en cualquier acción | La siguiente request falla (`getActor()` detecta `desactivadoEn`) y expulsa a login — no instantáneo en la otra pestaña, pero sí en su próxima interacción real con el servidor. ✅ **Verificado 2026-07-28** (Fase A) con el Usuario sembrado marcado `desactivado_en`: el primer intento crasheaba (`clearSessionCookie()` no puede llamarse desde un Server Component en render) — corregido moviendo el chequeo a `panel/layout.tsx` con `redirect("/api/auth/logout")` (nuevo handler `GET`, limpia la cookie y evita el loop con el proxy). Confirmado en navegador: `/panel` → 307 → `/api/auth/logout` → 307 → `/login`, sin crash. | 🔴 |
| ROL-SEC-10 | El Manager intenta desactivarse a sí mismo, o desactivar a otro Usuario con `rol: manager` | Rechazado explícitamente (regla: nadie desactiva al dueño de la cuenta esta fase) | 🟡 |

## 2. Seguridad de la información

| ID | Escenario | Resultado esperado | Pri |
|---|---|---|---|
| ROL-INFO-1 | Collaborator sin propiedades asignadas navega a Propiedades/Contratos/Cobros/Vouchers/Notificaciones/Estadísticas | Listas y KPIs completamente vacíos (no un subconjunto filtrado a medias, no un error) | 🔴 |
| ROL-INFO-2 | Collaborator recién aceptó su invitación (cero propiedades asignadas por defecto) | Arranca en cero acceso — nunca hereda ni ve nada hasta que el Manager le asigna algo explícitamente (principio de menor privilegio) | 🔴 |
| ROL-INFO-3 | Fuga de errores: forzar un error en `invitarColaborador`/`desactivarColaborador` (ej. email malformado, UUID inválido) | Mensaje `DomainError` genérico al cliente — nunca el stack trace o el nombre de tabla/columna de Prisma | 🟡 |
| ROL-INFO-4 | Trazabilidad de cambios de acceso — **confirmado como requisito, 2026-07-27**: `AuditoriaEquipo` (nuevo modelo, ver plan de implementación §1). Invitar, asignar/desasignar propiedad, desactivar y reactivar generan una fila cada uno | Cada acción queda registrada con actor, acción, objetivo (Usuario y/o Propiedad afectados), IP (`getClientIpFromHeaders`) y `createdAt`; visible para el Manager en `/panel/equipo`. Alcance acotado a acciones de equipo — **no** cubre auditoría general de cobros/contratos editados por un Collaborator (eso es una feature distinta, fuera de esta fase) | 🔴 |
| ROL-INFO-5 | Enmascaramiento de datos financieros/bancarios | **Fuera de alcance esta fase** — no hay distinción financiera granular en el modelo binario; el Collaborator ve montos completos de lo que tiene asignado. Vuelve a evaluarse en la fase de WebPay. | — |

## 3. Flujo y lógica de negocio

| ID | Escenario | Acción | Resultado esperado | Pri |
|---|---|---|---|---|
| ROL-FLU-1 | Reasignación de propiedad | El Manager mueve una propiedad de un Collaborator a otro directamente (sin pasar por "sin asignar") | La propiedad queda con el nuevo `asignadoAId`; el Collaborator anterior la pierde de sus listas en el siguiente request; el nuevo la ve de inmediato | 🔴 |
| ROL-FLU-2 | Desactivar con operación en curso | El Manager desactiva a un Collaborator que tiene un período de cobro a medio conciliar en una de sus propiedades | El período/contrato sigue existiendo intacto para el Manager; el Collaborator pierde acceso; la propiedad queda sin asignar (auto-unassign confirmado) | 🔴 |
| ROL-FLU-3 | Reactivación | El Manager reactiva a un Collaborator previamente desactivado | Puede volver a loguearse; **no** recupera automáticamente sus propiedades anteriores (quedaron sin asignar) — el Manager las reasigna a mano si corresponde | 🟡 |
| ROL-FLU-4 | Límite de cupos | El plan del Manager permite N usuarios; ya hay N-1 activos + Manager = N | El envío de una invitación adicional se bloquea (botón deshabilitado + mensaje; el servidor igual rechaza si se fuerza) | 🔴 |
| ROL-FLU-5 | Cupo reservado por invitación pendiente | Hay una invitación sin aceptar que ya ocupa el último cupo | Una segunda invitación nueva se bloquea aunque el Collaborator del primer invite todavía no haya aceptado | 🟡 |
| ROL-FLU-6 | Collaborator intenta crear una propiedad | Un Collaborator busca el flujo de "Nueva propiedad" | No tiene esa opción disponible (Manager-only esta fase, confirmado) | 🟡 |
| ROL-FLU-7 | Delegación temporal de rol Manager, roles personalizados, transferencia de titularidad | — | **Explícitamente fuera de alcance** de este plan — no implementar pruebas para esto; si aparece como necesidad real, es una decisión de producto nueva, no un bug de esta fase | — |

## 4. UI / UX

| ID | Escenario | Resultado esperado | Pri |
|---|---|---|---|
| ROL-UI-1 | Menú del panel para un Collaborator | No aparece "Equipo" (`/panel/equipo`) en el sidebar — ni siquiera atenuado; para el Manager sí aparece | 🔴 |
| ROL-UI-2 | Collaborator llega a `/panel/equipo` por link directo/antiguo | Redirección limpia a `/panel` (no un 403 crudo ni pantalla en blanco) — evaluar si conviene un mensaje breve tipo "Esta sección es solo para el administrador de la cuenta" en vez de silencioso | 🟡 |
| ROL-UI-3 | Desactivar un Collaborator | Requiere confirmación explícita (modal de doble paso, mismo patrón ya usado en "Confirmar término" de contratos) — no una sola llamada de acción sin fricción | 🔴 |
| ROL-UI-4 | Formulario de invitación al llegar al cupo | Botón deshabilitado + texto explicando el límite del plan, visible antes de que el Manager llene el formulario — no un error sorpresa después de escribir nombre/email | 🟡 |
| ROL-UI-5 | Selector "Colaborador asignado" en el editor de propiedad | Claro para el Manager (nombres reales, no ids); opción "Sin asignar" explícita; invisible para el Collaborator (no solo deshabilitado — no debería ni cargarse ese control en su sesión) | 🟡 |
| ROL-UI-6 | `/panel/equipo`: lista de Collaborators | Estado activo/desactivado visualmente claro (badge), cupos usados visibles arriba (`X / Y`), ambos temas Aurora + mobile | 🟡 |
| ROL-UI-7 | Email de invitación (dev: log de consola; prod: Resend) | Contenido claro, link funcional, coherente con el resto de los templates de `lib/email.ts` | 🟢 |

---

## 5. Automatización mínima esperada

Siguiendo la convención de [plan-de-pruebas-qa.md §2](plan-de-pruebas-qa.md) — estos son los tests Vitest que deben existir, no opcionales, antes de cerrar cada fase (detalle de casos en el plan de implementación §8):

- `lib/__tests__/scope.test.ts` — Manager sin restricción, Collaborator con 2 de 5 propiedades, Collaborator con 0 (nunca cae a "sin restricción" por accidente).
- `panel/equipo/__tests__/equipo-actions.test.ts` — límite de cupo (justo en el límite / uno menos), invitación de un solo uso, desactivar-desasigna-en-la-misma-transacción.
- Un test de scoping por cada módulo de la Fase D (Propiedades, Contratos, Cobros/Vouchers/Notificaciones, Estadísticas) — nunca combinar dos módulos en el mismo cambio.

---

> Plan de implementación: `.claude/plans/sparkling-booping-moler.md` (o su ubicación final si se archiva en `Docs/`). Plan de pruebas general del proyecto: [plan-de-pruebas-qa.md](plan-de-pruebas-qa.md). Historial de decisiones: [PROGRESO.md](PROGRESO.md).
