# ADR-0008 — Flujo de liquidación en dos pasos, ventana del corredor y ajustes

- **Fecha**: 2026-06-04
- **Estado**: Aceptada
- **Validado con**: el cliente (caso real de operación de una corredora)

## Contexto
Un caso real reveló cómo opera hoy una corredora: *"los clientes me pagan directo a mi cuenta; entre el 5 y el 10 liquido manual cada arriendo y envío la liquidación a arrendatarios y dueños; reviso cada una porque a veces hay descuentos por reparaciones que debo agregar; en estos días pago los arriendos a los dueños."* Este es el caso que en Leasity genera intereses fantasma al liquidar después del vencimiento.

## Lo que ya estaba resuelto
- **Sin intereses fantasma**: el interés se calcula sobre `fecha_pago_real` (declarada por el corredor), no sobre la fecha de liquidación (regla 5). El corredor puede liquidar tarde sin penalizar al arrendatario.
- **Días de gracia** del arrendatario (`mora_dias_gracia`).
- Tipo de notificación `recordatorio_vencimiento` ya existía.

## Decisiones (nuevas / refinamientos)

### 1. Ventana de liquidación del corredor (nuevo)
- Config a nivel de tenant: `ventana_liquidacion_dias` (p. ej. día 10 del mes).
- Es un **plazo operativo y de alertas**, NO afecta el cálculo de intereses (eso depende solo de `fecha_pago_real`).
- Corrige el malentendido de "darle más días para no cobrar interés": el problema no eran los días, sino qué fecha usa el sistema.

### 2. Flujo de liquidación en dos pasos (refinamiento)
- **Paso 1 — Conciliar**: registrar pago con fecha real → `PAGO_RECIBIDO`.
- **Paso 2 — Cerrar liquidación**: aplicar ajustes, calcular comisión y pago al propietario → `COMISION_CORREDOR`, `LIQUIDACION_PROPIETARIO` (+ ajustes), emitir voucher y liquidación, notificar.
- Estados del período: `pendiente → pagado → liquidado` (+ `atrasado`, `en_revision`).
- Se implementa como un **asistente de liquidación** (lista de pendientes del mes) que reemplaza el proceso manual tedioso.

### 3. Ajustes de liquidación (nuevo)
- Entidad `AjusteLiquidacion` por período: `tipo_ajuste` (`descuento_propietario` | `cargo_arrendatario` | `retencion`), `monto_clp`, `descripcion`, `creado_por`.
- Genera asientos `CARGO_AJUSTE` (aumenta deuda) o `AJUSTE_LIQUIDACION` (reduce billetera del propietario).

### 4. Cadencia de recordatorios (nuevo)
- Configurable con `recordatorio_dias_antes` (default 5). Avisos a arrendatario (antes/el día del vencimiento) y a corredor (sin pago registrado / fin de ventana). Ver regla 9.

### 5. Días corridos en el MVP (decisión)
- Plazos en **días corridos**; los **días hábiles** (requieren calendario de feriados de Chile) se difieren a Fase 2.

## Consecuencias (impacto en el modelo)
- Tenant: `ventana_liquidacion_dias`, `recordatorio_dias_antes`.
- Nueva tabla `ajuste_liquidacion`; nuevo enum `tipo_ajuste`.
- Ledger: tipos `CARGO_AJUSTE` y `AJUSTE_LIQUIDACION`; vistas de deuda/billetera ajustadas.
- `estado_periodo`: agregar `liquidado`.
- Se implementa al construir el flujo "Simular pago recibido" (Etapa 3).
