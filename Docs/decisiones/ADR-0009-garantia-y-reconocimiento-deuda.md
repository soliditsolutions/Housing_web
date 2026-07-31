# ADR-0009 — Mes de garantía y reconocimiento de deuda

- **Fecha**: 2026-06-04
- **Estado**: Aceptada
- **Origen**: investigación de mercado (ver [planificacion-final.md](../gestion/planificacion-final.md))

## Contexto
La investigación de mercado mostró que el **mes de garantía** es estándar en Chile y lo gestionan los competidores; nuestro modelo no lo tenía (brecha de paridad). Además, el **reconocimiento de deuda** ya estaba pedido en el resumen ejecutivo y es base para la cobranza. Ambos entran al MVP (alcance "Enfocado").

## Decisiones

### 1. Mes de garantía
- ~~Marco legal: la garantía no puede superar 2 rentas (Ley 18.101)~~ — **corregido 2026-07-30, ver "Revisión legal" abajo**: esa cita es incorrecta, Ley 18.101 no fija un tope. 1-2 meses es práctica de mercado recomendada, no un límite legal. Se devuelve al término con descuentos por daños no atribuibles al uso normal.
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

## Revisión legal (2026-07-30) — corrección de citas y rediseño de término anticipado

El usuario pidió una revisión completa de las cláusulas del sistema contra un contrato de arriendo real (aportado como referencia) y contra el texto vigente de la Ley 18.101, con miras a un futuro generador de contratos "100% legal" (conecta con ítem #9 de `Docs/gestion/PROGRESO.md`, hoy bloqueado pendiente de definición).

**Hallazgo — cita legal fabricada**: `contract-rules.ts`, el prompt de `validar-doc/route.ts`, y varios textos de UI citaban "art. 46, Ley 18.101" como fundamento del tope de 2 meses de garantía. Verificado contra el texto vigente de la ley (BCN/LeyChile, actualizado a jul-2026, vía búsqueda web): **Ley 18.101 tiene 27 artículos — el artículo 46 no existe**, y la ley no regula el monto de la garantía en absoluto hoy. Existe un proyecto de ley (Boletín 16.019-14 / 15.991-07, "estatuto de la garantía") que lo propondría — aún no aprobado.

**Corregido en todo el sistema** (código + copy de UI, sin cambiar el comportamiento — el rango 0-2 meses se mantiene como práctica de mercado recomendada, ya no como "límite legal"):
- `lib/contract-rules.ts` — regla de garantía > 2 meses pasa de crítica a recomendación; ya no cita el artículo inexistente.
- `api/contratos/[id]/validar-doc/route.ts` — prompt de la IA corregido para no marcar garantía > 2 meses como "ilegal".
- `panel/contratos/nuevo/nuevo-contrato-client.tsx`, `panel/contratos/nuevo/actions.ts`, `panel/contratos/[id]/cierre-section.tsx`, `panel/contratos/[id]/page.tsx` — textos de hint/error/ledger corregidos.
- `prisma/schema.prisma` — comentario del modelo `Contrato` corregido.

**Hallazgo — base legal real para el reajuste de garantía**: el **Art. 21, Ley 18.101** (verificado, texto real) sí exige reajustar por UF los pagos y devoluciones en mora entre las partes de un contrato de arriendo — es la base legal correcta del mecanismo `REAJUSTE_GARANTIA` que `terminarContrato` ya calculaba mecánicamente, ahora citado en el código donde corresponde.

**Rediseño — "multa por término anticipado" reemplazada por "renta del período faltante"**: el contrato real de referencia no tiene una cláusula de "multa de X meses" — tiene "el arrendatario debe pagar las rentas del período que falta" (proporcional al tiempo restante, no un monto fijo), fundado en Art. 1489 Código Civil + cláusula penal (Art. 1535 y ss.). El campo `multaMeses` del sistema (fijo, 1-3 meses, nunca cobrado automáticamente — solo informativo) no correspondía a ninguna cláusula real y fue **eliminado completamente** (columna `multa_meses` dropeada de `contrato`). `CierreSection` ahora calcula dinámicamente los meses restantes hasta `fechaFin` y muestra la renta equivalente como referencia informativa, citando Art. 1489 CC — igual criterio que el contrato real. Verificado en navegador con un contrato de prueba (4 meses restantes × 24,5 UF = 98 UF, cálculo correcto).

**Alcance de esta revisión**: corrección de citas falsas + alineación del término anticipado a la práctica real. **No sustituye una revisión de un abogado con matrícula** antes de que el sistema genere contratos de uso en producción — hay puntos genuinamente abiertos (ej. si el interés máximo convencional de Ley 18.010 aplica a la multa moratoria de arriendo, o el estado del proyecto de ley de garantía) que exceden lo que se puede resolver con investigación no profesional.
