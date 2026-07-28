# ADR-0004 — Reglas financieras del dominio

- **Fecha**: 2026-06-03
- **Estado**: Aceptada
- **Validado con**: el cliente (sesión de validación del modelo de dominio)

## Contexto
Antes de escribir código, se validó el modelo de dominio. Surgieron decisiones de negocio que no se podían inferir del resumen ejecutivo y que determinan todo el motor financiero.

## Decisiones

### 1. Denominación de la renta: UF **y** CLP
Cada contrato define si su renta es en UF o en CLP.
- **UF**: el valor en CLP flota a diario; **no** hay reajuste anual por IPC (sería doble indexación).
- **CLP**: monto fijo reajustado por variación del IPC en el aniversario del contrato.
- Consecuencia: se necesitan **dos series temporales** — UF diaria (SII/Banco Central) e IPC mensual (INE).

### 2. Interés por mora: configurable por contrato
- Cada contrato define `mora_tasa` y `mora_dias_gracia`.
- Interés solo si la **fecha real del pago** supera `vencimiento + gracia`. Resuelve el fallo #1 de Leasity.

### 3. Períodos: mes completo, sin prorrateo
- El arriendo de largo plazo se cobra por **mes completo** al inicio del período. No se prorratea por días.

### 4. Multa por término anticipado (en vez de prorrateo)
- Si el arrendatario se va antes del plazo pactado, se cobra una **multa** = `multa_meses` × arriendo (mes completo).
- `multa_meses` lo configura el corredor por contrato (1 o más).
- Aplicará el mismo mecanismo a arriendos diarios/semanales (Fase 2).

### 5. Conciliación: por monto exacto
- Un pago se concilia solo si coincide **exactamente** con lo adeudado del período (renta + interés a la fecha del pago).
- Si no coincide → se marca para **revisión manual**; no se auto-concilia.

## Supuesto registrado (a confirmar)
La combinación "monto exacto" + "interés diario" implica que el monto esperado de un período atrasado se calcula **a la fecha del pago**. Si el cálculo de interés del cliente difiere (p. ej. interés mensual redondeado), se ajusta esta regla.

## Consecuencias
- El campo `denominacion` bifurca la lógica de cálculo en todo el núcleo.
- El motor requiere ingestar y consultar dos series (UF, IPC).
- Se añade el tipo de asiento `CARGO_MULTA` al ledger.
- La conciliación incluye un estado "pendiente de revisión manual" para pagos que no cuadran exacto.
