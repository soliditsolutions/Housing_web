# ADR-0009 — Mes de garantía y reconocimiento de deuda

- **Fecha**: 2026-06-04
- **Estado**: Aceptada
- **Origen**: investigación de mercado (ver [planificacion-final.md](../gestion/planificacion-final.md))

## Contexto
La investigación de mercado mostró que el **mes de garantía** es estándar en Chile y lo gestionan los competidores; nuestro modelo no lo tenía (brecha de paridad). Además, el **reconocimiento de deuda** ya estaba pedido en el resumen ejecutivo y es base para la cobranza. Ambos entran al MVP (alcance "Enfocado").

## Decisiones

### 1. Mes de garantía
- Marco legal: la garantía no puede superar **2 rentas** (Ley 18.101); se devuelve al término con descuentos por daños no atribuibles al uso normal.
- **Contrato**: `garantia_meses` (0–2) y `garantia_monto_clp` (monto efectivamente recibido).
- **Es passthrough**: la garantía **no es ingreso** del propietario ni deuda recurrente del arrendatario; es un depósito retenido.
- **Ledger** (nuevos tipos):
  - `GARANTIA_RECIBIDA` — ingresa a la bolsa de garantía al inicio.
  - `RETENCION_GARANTIA` — al término, monto retenido por daños (sale de la bolsa).
  - `DEVOLUCION_GARANTIA` — al término, monto devuelto al arrendatario (sale de la bolsa).
- **Vista** `v_garantia_retenida` por contrato = Σ recibida − retenciones − devoluciones. Separada de deuda y billetera.

### 2. Reconocimiento de deuda (MVP light)
- Documento generado a partir del ledger (deuda vigente del arrendatario): detalle de períodos impagos, intereses y total.
- `tipo_documento` suma `reconocimiento_deuda`. Es la base para la cobranza y, en Fase 2, para el workflow de morosidad (Ley 21.461).

## Fuera de alcance (Fase 2)
- Liquidación avanzada de garantía con flujo de inspección de daños.
- FEA y procedimiento monitorio ("Devuélveme mi casa").

## Consecuencias
- `contrato`: `garantia_meses`, `garantia_monto_clp`.
- Ledger: 3 tipos nuevos de garantía; vista `v_garantia_retenida`.
- `tipo_documento`: `reconocimiento_deuda`.
- Se implementa junto al motor de liquidación (Etapa 3).
