# ADR-0013 — Cuentas multi-usuario (Manager / Collaborator)

- **Fecha**: 2026-07-27 (diseño) / 2026-07-28 (Fase A) / 2026-07-29 (Fases B, C y D)
- **Estado**: Aceptada — Fases A, B, C y D completas; E pendiente

## Contexto

Hasta ahora cada `Tenant` (la cuenta de la corredora) podía tener uno o más `Usuario`, pero `RolUsuario` (`admin`/`operador`) no se usaba para nada — cualquier Usuario autenticado veía y gestionaba el 100% de los datos del tenant. El negocio necesita que una corredora pueda tener personal: el **Manager** (dueño de la cuenta, siempre ve todo) y **Collaborators** (trabajadores que solo deben ver/gestionar las propiedades que el Manager les asigna).

`getTenant()` (usado en 17+ archivos) devolvía solo el `Tenant`, nunca el `Usuario` que llama — estructuralmente imposible filtrar "qué le corresponde a esta persona" sin tocar ese punto central primero.

## Decisión

**Modelo binario, sin matriz de permisos granular.** Un Manager por Tenant, fijo (el `admin` de hoy pasa a ser `manager`, sin transferencia de titularidad esta fase). Asignación de propiedad **exclusiva** (`Propiedad.asignadoAId`, un Collaborator por propiedad). El filtro cascadea a Propiedades, Contratos, Cobros, Vouchers, Notificaciones y Estadísticas. Invitación por email con token de un solo uso (mismo patrón que `ResetToken`); el Collaborator define su propia clave al aceptar. Offboarding: desactivar libera automáticamente sus propiedades asignadas. Cupos por plan = los que ya existían como texto de marketing en `lib/plans.ts`, ahora aplicados de verdad.

**RLS: sin cambios estructurales.** El filtro por-usuario es puro `WHERE` a nivel Prisma sobre las transacciones `withTenant()` existentes — agregar una variable de sesión por-usuario hubiera sido más riesgoso (toda tabla RLS necesitaría tocarse) para un beneficio marginal, dado que "el Manager ve todo" no mapea limpio a un único predicado RLS.

**Auditoría de acciones de equipo** (`AuditoriaEquipo`, agregado durante el diseño tras hallazgo `ROL-INFO-4` del plan de pruebas — ver `Docs/gestion/plan-de-pruebas-roles-multiusuario.md`): invitar, asignar/desasignar propiedad, desactivar y reactivar quedan registrados (actor, objetivo, IP, timestamp). Alcance acotado a gestión de equipo — no es auditoría general de cobros/contratos.

### Fase A (implementada 2026-07-28) — fundación invisible

- Rename de enum `RolUsuario`: `admin`/`operador` → `manager`/`colaborador` (`ALTER TYPE ... RENAME VALUE`, sin backfill).
- Schema: `Propiedad.asignadoAId`, `Usuario.desactivadoEn`, modelos `InvitacionColaborador` y `AuditoriaEquipo`.
- `getActor()` nuevo en `lib/queries.ts`; `getTenant()` pasa a ser un wrapper delgado sobre él — los 17+ call sites existentes siguen funcionando igual, y de paso ganan gratis la verificación de "Usuario desactivado".
- `login/actions.ts` rechaza el login (mensaje genérico, anti-enumeración) si `desactivado_en` viene no-nulo.

**Dos hallazgos de seguridad encontrados y corregidos en el mismo trabajo** (no diferidos a una fase posterior — ver `Docs/gestion/PROGRESO.md` y memoria `feedback-security-in-implementation`):

1. **RUT editable sin re-verificación** en `/panel/perfil` — el RUT es la clave de la verificación de identidad contra la cédula hecha en `/registro`, pero quedaba libremente editable después. Corregido: RUT, nombre y fecha de nacimiento quedan inmutables de por vida (verificado server-side contra la fila real, no solo oculto en la UI); teléfono y correo ahora requieren un código de 6 dígitos enviado al correo **actual** antes de aceptar el cambio (`CodigoCambioContacto`, mismo patrón que `CodigoDispositivo`).
2. **Crash en vez de expulsión limpia** al desactivar a un usuario con sesión activa (ROL-SEC-9): `getActor()` lanzaba un `Error` crudo que un Server Component no puede convertir en "cerrar sesión y redirigir" — `clearSessionCookie()` solo puede llamarse desde una Server Action o Route Handler. Corregido moviendo el chequeo a `panel/layout.tsx` (choke point de todo `/panel/*`) con `redirect("/api/auth/logout")` (nuevo handler `GET` en la ruta de logout existente).

### Fase B (implementada 2026-07-29) — invitación, onboarding y offboarding

- `panel/equipo/actions.ts`: `invitarColaboradorAction` (token de un solo uso, reutiliza `generateResetToken()`/`hashToken()` de `lib/token.ts`), `desactivarColaboradorAction`/`reactivarColaboradorAction` (Manager-only, nadie se desactiva a sí mismo ni al Manager), `getEquipo()`/`getInvitacionesPendientes()`.
- `invitacion/` (page + actions + form): el Collaborator define su propia contraseña al aceptar — nunca pasa por la verificación de cédula que sí hace el Manager en `/registro`.
- `/panel/equipo` (UI mínima): lista de colaboradores con badge activo/desactivado, formulario de invitación, invitaciones pendientes con expiración.
- `proxy.ts`: `/panel/equipo` gateado a `rol === "manager"` vía `session.rol` (JWT, sin consulta a BD); `/invitacion` agregada a páginas públicas de auth.

**Tres bugs encontrados y corregidos durante la verificación en navegador** (mismo estándar de cero-deuda-técnica que Fase A):

1. **RUT quedaba `readOnly` incondicional para todos los usuarios** tras el hardening de identidad de Mi perfil — bloqueaba a un Collaborator recién invitado (`rut=null`, nunca pasa por carnet) de fijarlo la primera vez. Corregido restaurando el patrón "editable hasta fijarse una vez", igual que `fechaNacimiento`.
2. **`invitacion/page.tsx` crasheaba** al resolver el tenant vía una relación (`invitadoPor.tenant`) bloqueada por RLS desde el cliente Prisma sin `withTenant`. Resuelto con la función SQL `auth_tenant_de_usuario()` ya existente.
3. **`getActor()` lanzaba un `Error` crudo** para un Collaborator desactivado con sesión activa; como Next.js renderiza `layout.tsx` y `page.tsx` en paralelo (no en cascada), una página podía ganarle la carrera al `redirect()` del layout y crashear con un Runtime Error sin manejar. Corregido haciendo que `getActor()` también haga `redirect()` limpio (`/login` o `/api/auth/logout` según el caso), sin depender de esa carrera — ver `Docs/gestion/plan-de-pruebas-roles-multiusuario.md` (ROL-SEC-9, re-verificado).

### Fase C (implementada 2026-07-29) — UI de asignación de propiedad

- `queries.ts`: `getPropiedades()` incluye `asignadoA {id, nombre}`; nueva `getColaboradoresActivos(tenantId)` (sin gate de rol — el llamador decide si renderiza el selector).
- `propiedades/page.tsx`: usa `getActor()` (no `getTenant()`) para exponer `rol`; solo pide la lista de colaboradores si `rol === "manager"`.
- `propiedades/actions.ts`: `crearPropiedad`/`actualizarPropiedad` aceptan `asignadoAId` opcional. Nuevo helper `resolverAsignacion()`: si el campo no viaja (Colaborador, la UI no lo renderiza) deja la asignación intacta; si viaja con el mismo valor actual, no-op; si cambia, exige `actor.rol === "manager"` (mismo patrón ROL-SEC-3 — rechazo dentro de la transacción, no solo oculto en la UI) y valida que el colaborador pertenezca al tenant, tenga `rol: "colaborador"` y esté activo. Cada cambio real queda en `AuditoriaEquipo` (`asignar_propiedad`/`desasignar_propiedad`).
- `propiedades-client.tsx`: selector nativo "Colaborador asignado" en `CamposProp`, gateado por `esManager` — **no se monta en absoluto** para un Collaborator (verificado en el árbol de accesibilidad, no solo `disabled`). Línea informativa "Colaborador asignado" en el modal de detalle, visible para ambos roles.
- Cobertura de tests: `propiedades/__tests__/propiedades-actions.test.ts` — 10 casos nuevos (rechazo Colaborador, no-op mismo valor, campo ausente, asignar, desasignar, reasignar directo ROL-FLU-1, colaborador inválido, creación con/sin asignación).

**Un bug pre-existente encontrado y corregido durante la verificación** (no introducido por esta fase, pero descubierto al probar el editor de propiedad):

- Los datos de seed (`prisma/seed.ts`) guardaban `region: "Metropolitana"` / `"La Araucanía"` — nombres informales que no coinciden con la lista canónica de 16 regiones (`Región Metropolitana de Santiago` / `Región de la Araucanía`) introducida en un trabajo anterior (validación backend contra lista cerrada). Cualquier edición de una propiedad sembrada fallaba silenciosamente la validación de región. Corregido en `seed.ts` (para futuros seeds) y con un `UPDATE` puntual sobre las filas ya sembradas en la BD de desarrollo.

### Fase D (implementada 2026-07-29) — cascada de filtrado

- `queries.ts`: nuevo helper `propiedadIdsVisibles(actor): Promise<string[] | null>` — `null` para `rol === "manager"` (sin filtro, ve todo el tenant), o el array (posiblemente vacío) de `Propiedad.id` con `asignadoAId === actor.usuarioId` para un Colaborador. Cada llamador hace spread condicional del `where` (`...(propiedadIds ? {propiedadId: {in: propiedadIds}} : {})`).
- **Dos formas de filtro según el modelo**: `Propiedad` y `Contrato` tienen FK directa (`id`/`propiedadId`), filtro directo. `PeriodoPago`, `Voucher` y `Notificacion` no tienen `propiedadId` propio — solo `Contrato` lo tiene — así que usan el filtro de relación anidada de Prisma: `contrato: { propiedadId: { in: propiedadIds } }`. Para `Notificacion` (cuyo `contratoId` es nullable) esto excluye implícitamente, para un Colaborador, las notificaciones sin contrato asociado — correcto, porque una notificación sin contrato no tiene dueño identificable.
- **Guard de ownership reutilizable** en `contratos/[id]/actions.ts`: `verificarOwnershipContrato(actor, asignadoAId)` — lanza `DomainError` si el actor es Colaborador y la propiedad del contrato no es la suya. Se reutiliza en `activarContrato`, `terminarContrato`, `adjuntarAnexo`, `renovarContrato` y `cancelarContratoBorrador`; `generarReconocimientoDeuda` usa el equivalente inline por no compartir el mismo patrón `try/catch DomainError`.
- **Un Colaborador SÍ puede crear contratos** (a diferencia de propiedades, que son Manager-only) pero solo sobre propiedades que le pertenecen — verificado en `crearContrato` comparando `asignadoAId` contra `actor.usuarioId`.
- **Estadísticas: exclusiva del Manager, sin recorte por propiedad.** Decisión tomada explícitamente con el usuario (2026-07-29) tras plantear la disyuntiva: escalar las ~25 queries de los 4 módulos de Estadísticas (turnover%, retención%, valoración promedio, comparables de mercado) a un subconjunto de propiedades de un Colaborador no produce métricas significativas (ratios de cartera calculados sobre 1-2 propiedades son ruido, no BI). Se optó por ocultarla enteramente para el Colaborador en 4 capas: `nav.tsx` (ítem no se monta, mismo criterio que "Equipo"), `proxy.ts` (redirect a `/panel` por `session.rol`), `estadisticas/page.tsx` (`redirect` de defensa en profundidad vía `getActor()`), y la ruta de exportación CSV `/api/panel/estadisticas/exportar/route.ts` (guard inline, porque esta ruta **no** está cubierta por el matcher `/panel/:path*` de `proxy.ts` — cualquier gateo Manager-only sobre rutas `/api/panel/*` debe hacerse en el propio handler).
- **Decisiones de alcance confirmadas con el usuario** antes de implementar: (1) un Colaborador nunca crea propiedades, solo el Manager; (2) el filtro sobre Contratos es lectura + escritura completas desde ya (no solo lectura); (3) Estadísticas exclusiva del Manager (ver punto anterior).
- **Resumen (dashboard raíz `/panel`) queda fuera de alcance a propósito** — la decisión original ("El filtro cascadea a Propiedades, Contratos, Cobros, Vouchers, Notificaciones y Estadísticas") nunca nombra el dashboard raíz; `getResumen()` sigue mostrando totales de todo el tenant también a un Colaborador. Verificado en navegador (no es un olvido): no se toca en esta fase.
- Módulos con el mismo patrón cascada aplicado: Propiedades (filtrar lista + Manager-only en crear + ownership en editar/activar/desactivar), Contratos (filtrar lista/detalle con `notFound()` ante IDOR + ownership en las 6 actions), Cobros (filtrar lista + ownership en `simularPago`/`cerrarLiquidacion`), Vouchers (filtrar lista), Notificaciones (filtrar lista + ownership en `marcarSimulada` + filtro en el `updateMany` de `simularEnvioMasivo`; el cron `/api/cron/recordatorios` sigue sin filtro vía `tenantOverride`, procesa todo el tenant como corresponde a un job de sistema sin sesión de usuario).
- Cobertura de tests nueva/actualizada: `propiedades-actions.test.ts` (26 casos), `contratos/[id]/__tests__/contrato-ownership.test.ts` (nuevo, 5 casos), `cobros-actions.test.ts` (13 casos, migrado de mock `getTenant`→`getActor`), `nav.test.tsx` (gating de Estadísticas).
- Verificación en navegador: María (manager) ve las 4 propiedades y todos los módulos sin cambios; Pedro (colaborador) con 0 propiedades asignadas ve estados vacíos en todos los módulos filtrados sin crashear (incluida la generación batch de recordatorios) y es redirigido de `/panel/estadisticas`; con 1 propiedad asignada, Propiedades muestra exactamente esa; intentar acceder por URL directa a un contrato de una propiedad no asignada devuelve un 404 limpio (`notFound()`), sin filtrar datos del contrato — protección IDOR confirmada.

### Fase pendiente

E (cupos por plan). Ver el plan de implementación original para el detalle.

## Alternativas consideradas

- **Matriz de permisos granular por módulo**: descartada para esta fase — el modelo binario cubre el caso de uso real (un Collaborator gestiona lo suyo o nada) sin la complejidad de UI/datos de permisos configurables.
- **RLS por-usuario (variable de sesión adicional)**: descartada — ver "RLS: sin cambios estructurales" arriba.
- **Collaborator con membresía multi-tenant**: descartada — un Usuario pertenece a un solo Tenant, igual que hoy; simplifica sesión y evita un flujo de "cambiar de espacio de trabajo" no pedido.

## Consecuencias

- Todo código nuevo que necesite "quién soy y qué tenant" debe usar `getActor()`, no re-implementar la lectura de sesión — hereda gratis la verificación de usuario desactivado.
- Cualquier futuro chequeo de autorización que pueda terminar en "cerrar sesión" debe vivir en una Server Action, Route Handler, o un Server Component que redirija a una de esas dos (nunca intentar mutar cookies directamente en un layout/page).
- Fase E queda pendiente (cupos por plan) — con A-D implementadas, el ciclo completo Manager→invita→asigna propiedad→Collaborator ve/gestiona solo lo suyo ya funciona de punta a punta, incluida la protección IDOR a nivel de Server Action y de página.
