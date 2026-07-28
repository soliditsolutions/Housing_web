# 03 — Roadmap del MVP

## Qué es este MVP

Un **prototipo local funcional** que sirve como acercamiento creíble a la app final. No es producción: corre en la máquina con Docker. Su propósito es **demostrar con certeza** que los problemas centrales de Leasity están resueltos.

Fidelidad (ver [ADR-0003](../decisiones/ADR-0003-fidelidad-prototipo.md)):
- **Lógica de dominio = real** sobre PostgreSQL local.
- **Integraciones externas = simuladas** (pago, banco, correo, UF) con mocks creíbles.

## Stack del prototipo (ver [ADR-0002](../decisiones/ADR-0002-stack-y-seguridad.md))
- Next.js (App Router) + TypeScript — monolito modular.
- Tailwind CSS + shadcn/ui — UI cuidada para usuarios no técnicos.
- PostgreSQL en Docker + Prisma ORM.
- Núcleo financiero en un paquete aislado, sin imports de Next.js.

## Alcance del MVP (foco: SaaS B2B)

### Incluye
1. **Autenticación y roles** (simulada/local): corredor, propietario, arrendatario.
2. **Gestión de propiedades**: CRUD de propiedades e imágenes.
3. **Contratos**: crear contrato con fecha de inicio, valor (UF/CLP), día de vencimiento y % comisión configurables.
4. **Calendario de pagos** automático por contrato.
5. **Conciliación**: botón "Simular pago recibido" que dispara el flujo real de conciliación → marca período pagado con fecha real → emite voucher → registra "correo enviado".
6. **Reajuste de IPC por aniversario** de cada contrato (real, con serie de UF de ejemplo).
7. **Ledger y vouchers** inmutables, con filtros (rango, arrendatario, propiedad, estado).
8. **Dashboard del corredor**: estado de cobros, próximos vencimientos, billetera/recaudación.
9. **Portal de autoconsulta (OTP simulado)**: arrendatario/propietario acceden con RUT + ID + código; ven su arriendo, pagos y descargan documentos (URL firmada). OTP y envío simulados.
10. **Documentos**: generar/adjuntar contrato, comprobantes y certificado de reserva.
11. **UI responsiva** y amigable.

> **Ampliación tras validación de mercado (ADR-0008, ADR-0009, doc 06):** el MVP "Enfocado" suma **mes de garantía**, **ajustes de liquidación** (reparaciones), **asistente de liquidación en 2 pasos**, **recordatorios** y **reconocimiento de deuda** (documento).

### No incluye en el MVP (Fase 2)
- ~~Marketplace público B2C completo (solo un esbozo de la vista pública si da el tiempo).~~ **→ Adelantado y completado (jul 2026): listado con filtros, ficha, contacto, denuncias, valoraciones. Ver PROGRESO Etapa 5.**
- Arriendos diarios tipo Airbnb (calendario de disponibilidad).
- Integraciones reales de pago/banco/correo.
- **Firma electrónica avanzada (FEA)** y contrato conforme a Ley 21.461.
- **Workflow de morosidad** ("Devuélveme mi casa") completo.
- Sindicación a portales de propiedades; suscripción/billing real del SaaS.

## Fases del proyecto

| Fase | Foco |
|---|---|
| **MVP (local)** | Núcleo financiero B2B real + integraciones simuladas + UI cuidada. |
| **Fase 2** | Marketplace público B2C, arriendos diarios, FEA + Ley 21.461, workflow de morosidad, integraciones de pago reales, sindicación a portales. |
| **Escalabilidad** | Despliegue en nube, billing del SaaS, ETL/analítica de mercado, app móvil. |

## Plan de construcción del MVP (orden propuesto)

1. **Andamiaje**: repo Next.js + TypeScript + Tailwind + shadcn + Docker Postgres + Prisma. _(✅ hecho)_
2. **Esquema de datos** + RLS + seeds (UF de ejemplo, tenant demo). _(✅ hecho)_
3. **Paquete de dominio** aislado: calendario, IPC por aniversario, ledger, conciliación (con tests). _(✅ hecho — 47/47 tests)_
4. **Auth y roles** simulados. _(✅ hecho — + 2FA por dispositivo)_
5. **CRUD propiedades + contratos** con UI. _(✅ hecho — incl. edición, ciclo de vida, término/renovación)_
6. **Flujo de conciliación** simulado end-to-end. _(✅ hecho — con reajuste IPC aplicado al conciliar)_
7. **Dashboard + filtros de vouchers.** _(✅ hecho)_
8. **Pulido de UI/UX** y revisión de accesibilidad. _(✅ hecho)_

> El estado vivo de estas tareas se lleva en [PROGRESO.md](PROGRESO.md). **Estado 2026-07-01: MVP ~97 % (solo resta el recorrido de demostración). Extras adelantados de Fase 2: portal OTP, marketplace B2C, validación con IA.**

## Criterio de "MVP terminado"
Se puede, en local: crear un contrato con fecha y montos propios, simular un pago, ver que se concilia con la fecha real (sin intereses falsos), ver el voucher inmutable, y comprobar que el reajuste de IPC ocurre en el aniversario del contrato — todo con una UI que una persona no técnica pueda usar sin instrucciones.
