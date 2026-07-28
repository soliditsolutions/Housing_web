# 🧠 BRAIN — Contexto vivo del proyecto Housing

> **Qué es esto.** Un único documento con el contexto que no se deduce del código: gotchas técnicos ya resueltos, decisiones no obvias, convenciones, restricciones de seguridad, patrones de trabajo y lecciones aprendidas. Sirve como **memoria de largo plazo** para retomar el proyecto o para asistentes de IA. Si resuelves un problema no trivial o descubres algo que costó entender, **anótalo aquí**.
>
> Última actualización: 2026-07-27.

---

## 1. Mapa mental rápido

- **Monorepo** npm workspaces: `apps/web` (Next.js) + `packages/core` (`@housing/core`, dominio financiero sin framework).
- **Tres audiencias, tres superficies:** corredor → `/panel` (cuenta + JWT `hw_session`); arrendatario/propietario → `/portal` (sin cuenta, OTP, JWT `hw_portal`); público → `/marketplace` (sin auth).
- **Fuente de verdad de negocio:** `Docs/` (ver `Docs/README.md`). Fuente de verdad de datos: `apps/web/prisma/schema.prisma`.
- **Filosofía del MVP:** lógica de dominio **real**; integraciones externas (pago, banco, correo, UF/IPC) **simuladas** con mocks creíbles (ADR-0003).

---

## 2. Gotchas técnicos ya resueltos (no repetir)

- **Next.js 16 usa `proxy.ts`, NO `middleware.ts`.** La función se llama `proxy()`. Convención nueva de Next 16. El gate de sesión + dispositivo vive ahí.
- **Turbopack cachea errores de compilación obsoletos.** Tras editar/regenerar (especialmente el cliente Prisma o secuencias largas de edits), el log puede mostrar errores de un estado intermedio aunque el archivo ya esté correcto. Si el archivo en disco está bien y la página renderiza, el error del log es basura de caché → se limpia recompilando o reiniciando el dev server. No perseguir errores fantasma.
- **Turbopack puede dejar de recompilar `globals.css` específicamente, sin ningún error visible.** Distinto del punto anterior (ahí el problema es un error viejo en el log; acá el problema es que el CSS nuevo directamente nunca llega al navegador — el chunk servido queda con el contenido de antes, byte a byte, aunque el archivo en disco ya tenga el cambio). Reiniciar el dev server **no alcanza**: el chunk en `.next/dev/static/chunks/` queda con timestamp viejo indefinidamente. Fix: parar el server, `rm -rf apps/web/.next`, volver a levantarlo. Diagnóstico rápido: `getComputedStyle(el, '::before').backgroundImage` (o la propiedad que corresponda) sigue devolviendo el valor anterior pese a que el archivo fuente ya cambió.
- **Windows dev server: `taskkill`/`Stop-Process` sobre el proceso de `next dev` no mata el árbol completo.** `npm run dev` (vía `next dev`) en Windows deja procesos `node.exe` huérfanos cuando se lo detiene (el wrapper de npm no propaga la señal a los hijos). Síntoma: el siguiente intento de levantar el server falla con "Another next dev server is already running" en un PID distinto al que se acaba de detener, o el puerto 3000 sigue ocupado. Solución: pedirle al usuario que corra `Stop-Process -Id <PID> -Force` sobre CADA PID huérfano (`Get-Process -Name node` para listarlos) — nunca ejecutar el kill uno mismo sin que el usuario lo autorice explícitamente (ver §7, "no matar procesos del sistema").
- **Prisma 7 eliminó el motor Rust.** Requiere **driver adapter**: `new PrismaClient({ adapter })` con `@prisma/adapter-pg` + `pg`. La URL va por `prisma.config.ts` / `dotenv`.
- **Serialización de `Decimal` de Prisma a Client Components.** Los `Decimal` (y `Date`) deben convertirse a `number`/`string` antes de pasarlos como props a componentes cliente, o React falla. Serializar en el Server Component.
- **RLS instalado pero sin enforcement real** hasta usar un rol no-dueño (`housing_app`) en producción. En dev el dueño de la tabla bypassa RLS — la aislación multi-tenant hoy la garantiza el código (verificar `tenantId` en cada query/mutación).
- **El `Button` de shadcn no soporta `asChild`** en esta versión.
- **Imports del workspace sin extensión** (`@housing/core`), no `.js`.
- **Puerto de Postgres = 5433** en el host (Docker), para no chocar con un Postgres del sistema en 5432.
- **Fechas hardcodeadas = bug.** Hubo `Date.UTC(2026, 5, 5)` fijos que rompían tras esa fecha. Siempre fechas dinámicas.
- **Un set de tokens CSS "fijo" (no themeado) no es reutilizable fuera de su contexto original.** `--hw-sidebar*` se diseñó a propósito como navy fijo en ambos temas — para el aside de marca de login/registro, un panel decorativo que debe verse igual sin importar el tema del sitio. Reusarlo en el sidebar del **panel** (navegación de trabajo diaria, si debe adaptarse al tema) hizo que "cambiar a claro" solo aclarara la misma paleta oscura por transparencia, nunca un diseño claro real. Fix: `--hw-panel-nav-*` (`globals.css`), un set paralelo que sí cambia por tema, usado solo por `shell.tsx`/`nav.tsx`. Lección: antes de reusar un token o clase "porque ya existe y se ve parecido", confirmar que el contexto de origen tiene la misma relación con el tema que el contexto nuevo.

---

## 3. Convenciones del código

- **Idioma:** dominio y UI en español (nombres de modelos, campos, rutas, copy). Utilidades genéricas pueden ir en inglés.
- **Dinero:** `Decimal`/enteros, **nunca `float`**. UF como serie temporal; todo monto en UF se resuelve a CLP a la fecha del evento.
- **Autorización en la capa de datos** (Server Actions / Route Handlers), nunca solo en el proxy (CVE-2025-29927). Verificar `tenantId` **dentro** de la transacción antes de escribir.
- **Errores al cliente:** clase `DomainError` para mensajes controlados; los errores de Prisma/DB **nunca** se exponen (fugan nombres de tablas). Ver SEC fixes en PROGRESO.
- **Ledger append-only:** los asientos no se editan ni borran; se reversan con asientos nuevos (`reversaDe`). Un trigger de Postgres rechaza UPDATE/DELETE.
- **RUT:** una sola fuente, `@housing/core` (`validarRut`/`formatearRut`, mod-11). `apps/web/src/lib/rut.ts` es una fachada que re-exporta con nombres en inglés + `canonicalRut` (forma para BD).
- **Spinners:** anillo blanco para botones oscuros → `<Spinner>`; `<Loader2>` de lucide para el panel.
- **Formato/pluralización:** `lib/format.ts` (`clp`, `fecha`, `clpOrUf`, `plural`). Metadatos de propiedad: `lib/propiedad-meta.ts`.

---

## 4. Restricciones de seguridad (invariantes)

- **Nunca exponer mensajes internos** (Prisma/stack) al cliente.
- **`NODE_TLS_REJECT_UNAUTHORIZED=0` es SOLO DEV** — nunca en producción (el `startup-check` lo bloquea).
- **Anti-enumeración (ADR-0007):** el portal responde idéntico exista o no el RUT; timing-safe.
- **Documentos por acceso autenticado y auditado** (`acceso_log`); nunca enlaces públicos. `Cache-Control: no-store, private`.
- **Ley 21.719 Art. 4:** consentimiento explícito e inequívoco (checkbox NO premarcado). Se guarda `consentGivenAt` + `consentVersion`.
- **Uploads:** validación de MIME **por magic bytes** + tamaño; nombres UUID; regex estricta para rutas de imagen.
- **Secretos JWT:** `AUTH_SECRET` firma panel; portal usa prefijo `"portal:" + AUTH_SECRET`; dispositivo usa su propio flujo. Tokens siempre como **hash SHA-256** en BD, nunca en claro.

---

## 5. Testing

- **Núcleo (`@housing/core`):** `npm test -w @housing/core`. Cubre calendario, IPC por aniversario, ledger, conciliación, garantía, RUT. Referencia histórica: **47/47 verdes**.
- **App (`@housing/web`):** `npm test -w @housing/web` (Vitest + Testing Library + jsdom). Incluye tests de acciones de cobros, seguridad de IA (anti prompt-injection) y sanitización de documentos.
- **Verificación manual:** se usa el preview del navegador (Claude Preview) para validar flujos end-to-end (crear contrato, conciliar, portal, modales). No confiar solo en que "compila".

---

## 6. Errores y soluciones destacados (histórico)

| Problema | Causa raíz | Solución |
|---|---|---|
| `PrismaClientValidationError` tras cambiar schema | Turbopack cacheó el cliente Prisma viejo | Reiniciar el dev server tras `prisma generate` |
| Mutación cross-tenant en `crearContrato` | `propiedadId`/`propietarioId` no verificados contra `tenantId` | `findFirst({ tenantId })` dentro de la `$transaction` |
| Fuga de `e.message` de Prisma al cliente | catch devolvía el error crudo | Clase `DomainError`; solo errores de dominio llegan al cliente |
| Contratos CLP nunca reajustaban | `esPeriodoDeReajuste` existía pero `simularPago` no lo llamaba | Aplicar `aplicarReajusteIpc` al conciliar (cobros/actions.ts) |
| Períodos "fantasma" como deuda falsa | al terminar contrato no se cancelaban períodos futuros | Cancelarlos en la misma transacción (enum `cancelado`) |
| `/portal` con 4 etiquetas distintas + enlaces legales muertos | copy inconsistente / `href="#"` | Auditoría UX 2026-07-01: unificado a "Consulta tu arriendo", enlaces reales |
| **Guardar el perfil expulsaba a 2FA** (AUD-01) | `perfil/actions.ts` re-firmaba el JWT copiando campos a mano y omitía `deviceToken` | Preservar `{ ...session }` (menos `iat`/`exp`) al re-firmar, igual que `refreshSessionWithDevice` |
| **Ningún período pasaba nunca a "atrasado"** (AUD-09, crítico) | La Regla 11 del dominio ("atrasado si vence sin pago") nunca se implementó — ningún código escribía ese estado; el `seed.ts` lo fabricaba a mano, ocultando el gap en todas las demos previas. Efecto: Cobros mostraba "Todo al día" siempre, y la conciliación era **imposible** para cualquier período real (la compuerta atómica de `simularPago` exige `estado: "atrasado"`) | `marcarPeriodosAtrasados(tenantId)` en `lib/queries.ts` (`UPDATE ... WHERE estado='pendiente' AND fecha_vencimiento < hoy`), invocada de forma perezosa en dashboard/cobros/detalle de contrato/portal + en el cron de recordatorios |
| **`pg` DeprecationWarning "client already executing a query"** en `/panel/cobros` y `/panel/contratos/[id]` (2026-07-27) | Dentro de un callback de `withTenant(tenantId, async (tx) => {...})`, varias funciones llamaban a `getUfCLP(fecha)` — que usa el cliente Prisma **global** (`prisma.serieUf...`), no `tx`. Esa query corre fuera de la transacción mientras la transacción sigue abierta en la misma conexión física → `pg` la detecta como concurrencia sobre un mismo cliente. Afectaba `getPeriodosPendientes`, `getContratoDetalleTx`, la Server Action `terminarContrato`, y las 6 funciones nuevas de Estadísticas (ítem 10) | `getUfCLPTx(tx, fecha)` — misma lógica pero consulta `tx.serieUf` en vez del cliente global. **Regla general: dentro de un `withTenant`, todo debe pasar por `tx`, nunca por el `prisma` importado directo** — el propio código ya tenía este patrón para `marcarPeriodosAtrasadosTx`, pero no era obvio que aplicara también a un helper de solo-lectura como `getUfCLP`. |

> ⚠️ **Lección de método:** los datos de `seed.ts` fabrican a mano estados (`atrasado`, `pagado`, `liquidado`) que la aplicación en producción real nunca genera por sí sola. Cualquier verificación E2E debe crear datos **desde cero por la UI** (no confiar en el seed) para detectar transiciones de estado faltantes — así se encontró AUD-09, invisible en todas las sesiones anteriores que trabajaron sobre datos ya sembrados.

---

## 7. Cómo trabaja el equipo (estilo de colaboración)

- **Cuestionar ideas**, no validar por validar. Proponer alternativas con criterio.
- **Validar en papel** antes de tocar código en cambios grandes o delicados.
- **Documentar todo** lo que genere valor (aquí y en `Docs/`).
- **Seguridad primero.**
- **No matar procesos del sistema:** si un puerto está ocupado, avisar al usuario con PID/puerto y pedirle que lo cierre él.
- **Responder en español.**

---

## 8. Pendientes conocidos / deuda

- Recorrido formal de demostración del criterio "MVP terminado".
- Config de producción: cargar índices en `serie_ipc`, `RESEND_API_KEY` + `CRON_SECRET` + DNS, migrar `public/uploads/` a S3/R2.
- Fase 2: FEA + Ley 21.461, workflow de morosidad, pagos reales (PAC/Pago Fácil/Fintoc), sindicación a portales, billing SaaS, arriendos por días (STR, ver ADR-0010).

---

_Este documento reemplaza/centraliza el contexto que antes vivía disperso en notas de sesión. Mantenerlo vivo: al cerrar un problema no trivial, agrega una fila en §6 o una viñeta en §2._
