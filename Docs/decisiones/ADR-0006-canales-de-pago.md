# ADR-0006 — Canales de pago, validación y gasto común passthrough

- **Fecha**: 2026-06-04
- **Estado**: Aceptada
- **Validado con**: el cliente

## Contexto
Se definió cómo entran y se validan los pagos, priorizando seguridad, y cómo se trata el gasto común (que no es ingreso del corredor ni del propietario).

## Decisiones

### 1. Canales de pago y validación
- **Canales oficiales: PAC y "Pago Fácil"** → fuente confiable. El sistema confirma el pago y lo **concilia automáticamente** (con calce exacto del monto).
- **Transferencia u otro canal off-platform** → `transferencia_declarada`: entra como `en_revision` y exige **comprobante adjunto + declaración jurada simple + confirmación de un corredor** antes de impactar la contabilidad. Se registra quién declara, quién confirma y cuándo (responsabilidad trazable).
- La declaración jurada con firma electrónica legal es **Fase 2**; en MVP se guarda el comprobante y la aceptación.
- Principio: el camino oficial es automático y la plataforma empuja hacia él; el manual es la excepción con controles compensatorios.

### 2. Gasto común = passthrough
- El gasto común **no es ingreso** del corredor ni del propietario; es un gasto básico de paso.
- Se cobra de forma **flexible** (junto al arriendo o coordinado con el corredor, según el contrato), controlado por `contrato.cobra_gasto_comun`.
- En el ledger se imputa con `concepto = 'gasto_comun'` y queda **excluido de la billetera del propietario y de la comisión**. Se observa en la vista `v_gasto_comun_recaudado`.

## Consecuencias
- `pago_entrante` incorpora `canal`, comprobante, declaración jurada y confirmación.
- `asiento_ledger` incorpora `concepto` para imputar pagos y aislar el gasto común.
- La conciliación automática solo aplica a canales confiables; los declarados pasan por confirmación humana.
- Vista nueva `v_gasto_comun_recaudado` para el dinero passthrough.
