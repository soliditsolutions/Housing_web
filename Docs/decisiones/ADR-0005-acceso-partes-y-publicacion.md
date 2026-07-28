# ADR-0005 — Modelo de acceso, partes, notificaciones y publicación

- **Fecha**: 2026-06-04
- **Estado**: Aceptada
- **Validado con**: el cliente (observaciones sobre el esquema)

## Contexto
Al revisar el esquema, el cliente precisó quién se autentica, qué ve cada parte, qué comunicaciones recibe, y enriqueció la propiedad/publicación y la reserva.

## Decisiones

### 1. Solo los corredores se autentican
- `usuario` = staff de la corredora (roles `admin`/`operador`), con login.
- Propietarios y arrendatarios son `persona` (sin login). Esto **revierte** la idea previa de un `usuario` único para los tres roles.

### 2. Acceso de propietarios y arrendatarios
- Ambos solo acceden al **sitio público** (marketplace).
- **Propietario**: además consulta el estado de su vivienda mediante **RUT + ID de propiedad** (consulta de solo lectura, acotada; no es una sesión del SaaS).
- **Arrendatario**: solo sitio público; se entera de todo por notificaciones.

### 3. Notificaciones
Nueva entidad `notificacion` (canal email, simulado en MVP):
- **Arrendatario**: `cobro` (arriendo y/o gasto común), `voucher_pago`, `recordatorio_vencimiento`.
- **Propietario**: `liquidacion_propietario` (pago de su arriendo), `salida_anticipada`, `termino_contrato`, `nuevo_contrato`, `solicitud_firma`.
- La firma electrónica real (`solicitud_firma`) es Fase 2; en MVP se registra la notificación.

### 4. Propiedad enriquecida
La propiedad incorpora: dirección, antigüedad, orientación, m² construidos, m² totales, ¿es condominio?, ¿paga gastos comunes? + valor, plantas, piezas, baños, estacionamientos, descripción libre. Los datos duros viven en `propiedad`; la `publicacion` queda como aviso de marketing (título, descripción, precio, fotos).

### 5. Gasto común
- Atributo de la propiedad (`paga_gastos_comunes`, `valor_gastos_comunes` en CLP).
- Switch por contrato (`cobra_gasto_comun`).
- Se cobra como asiento separado por período: `CARGO_GASTO_COMUN`.

### 6. Reserva de propiedad
- `estado_propiedad` ∈ {disponible, reservada, arrendada} + tabla `reserva` (interesado, vigencia, notas).
- El corredor marca la reserva; **la publicación se baja** cuando la propiedad no está disponible.

## Consecuencias
- Dos tablas de actores: `usuario` (auth) y `persona` (partes).
- El plano público gana una consulta de propietario por RUT + ID (solo lectura).
- Nuevo tipo de asiento `CARGO_GASTO_COMUN` y nueva entidad `notificacion`.
- `propiedad` es la fuente de datos; `publicacion` solo marketing.
