# ADR-0013 — Cuentas multi-usuario (Manager / Collaborator)

- **Fecha**: 2026-07-27 (diseño) / 2026-07-28 (Fase A implementada)
- **Estado**: Aceptada — Fase A completa, Fases B-E pendientes

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

### Fases pendientes

B (invitación/onboarding/offboarding + `/panel/equipo` mínimo), C (UI de asignación de propiedad), D (cascada de filtrado por módulo), E (cupos por plan). Ver el plan de implementación original para el detalle de cada una.

## Alternativas consideradas

- **Matriz de permisos granular por módulo**: descartada para esta fase — el modelo binario cubre el caso de uso real (un Collaborator gestiona lo suyo o nada) sin la complejidad de UI/datos de permisos configurables.
- **RLS por-usuario (variable de sesión adicional)**: descartada — ver "RLS: sin cambios estructurales" arriba.
- **Collaborator con membresía multi-tenant**: descartada — un Usuario pertenece a un solo Tenant, igual que hoy; simplifica sesión y evita un flujo de "cambiar de espacio de trabajo" no pedido.

## Consecuencias

- Todo código nuevo que necesite "quién soy y qué tenant" debe usar `getActor()`, no re-implementar la lectura de sesión — hereda gratis la verificación de usuario desactivado.
- Cualquier futuro chequeo de autorización que pueda terminar en "cerrar sesión" debe vivir en una Server Action, Route Handler, o un Server Component que redirija a una de esas dos (nunca intentar mutar cookies directamente en un layout/page).
- Fases B-E quedan bloqueadas hasta que se retome el plan — Fase A es funcionalmente invisible (sin cambio de comportamiento para el Manager único de hoy) y de bajo riesgo por diseño.
