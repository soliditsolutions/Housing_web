# Historias de usuario y casos de uso

> Interacciones descritas desde el usuario, con criterios de aceptación verificables. Formato **"Como [rol], quiero [acción] para [beneficio]"** + criterios en estilo **Dado / Cuando / Entonces**. Cada historia referencia su requerimiento en el [PRD/SRS](prd-srs.md).

Prioridad: 🔴 alta · 🟡 media · 🟢 baja. Estado: ✅ implementada · 🔜 Fase 2.

---

## Épica A — Corredor: cuenta y acceso seguro

### HU-A1 — Crear cuenta (RF-AUTH-01) 🔴 ✅
**Como** corredor, **quiero** registrar mi corredora en minutos **para** empezar a gestionar arriendos.
- **Dado** que estoy en `/registro` **y** completo datos válidos **y** acepto los Términos y la Política (checkbox no premarcado),
- **Cuando** envío el formulario,
- **Entonces** se crea mi Tenant + usuario admin, se guarda mi consentimiento (fecha + versión) y quedo autenticado.
- **Criterio extra:** si no acepto el consentimiento, no puedo continuar (Ley 21.719 Art. 4).

### HU-A2 — Verificar dispositivo (2FA) (RF-AUTH-04) 🔴 ✅
**Como** corredor, **quiero** verificar mi dispositivo con un código al email **para** proteger mi cuenta sin apps externas.
- **Dado** que inicio sesión desde un dispositivo no reconocido,
- **Cuando** ingreso el código de 6 dígitos enviado a mi correo (válido 10 min, máx. 3 intentos),
- **Entonces** el dispositivo queda recordado y accedo al panel; los próximos ingresos desde él no piden código.

### HU-A3 — Recuperar contraseña (RF-AUTH-03) 🟡 ✅
**Como** corredor, **quiero** recuperar mi contraseña por email **para** no perder el acceso.
- **Dado** que solicito recuperación con mi email,
- **Cuando** existe (o no) la cuenta,
- **Entonces** recibo una respuesta **idéntica** (anti-enumeración); si existe, llega un enlace de un solo uso que caduca.

---

## Épica B — Corredor: propiedades y contratos

### HU-B1 — Publicar una propiedad (RF-PROP-01, RF-PROP-04) 🔴 ✅
**Como** corredor, **quiero** cargar una propiedad con fotos **para** ofrecerla en el marketplace.
- **Dado** que creo una propiedad e indico el RUT del propietario,
- **Cuando** guardo,
- **Entonces** la propiedad nace en `borrador`, el propietario se crea/reutiliza por RUT, y puedo subir hasta 5 imágenes válidas (≤ 5 MB, formato de imagen real).

### HU-B2 — Crear un contrato (RF-CONT-01..03) 🔴 ✅
**Como** corredor, **quiero** crear un contrato con sus condiciones **para** generar el calendario de pagos automáticamente.
- **Dado** que completo el wizard (propiedad → arrendatario → condiciones → vigencia),
- **Cuando** confirmo,
- **Entonces** veo el **preview del calendario**, se generan los períodos (N a plazo fijo o 12 indefinido), la propiedad pasa a `reservada` y el contrato queda en `borrador`.
- **Criterio extra:** ninguna escritura ocurre si la propiedad/propietario no pertenece a mi tenant.

### HU-B3 — Renovar / terminar contrato (RF-CONT-05, RF-CONT-06) 🔴 ✅
**Como** corredor, **quiero** renovar o dar término a un contrato **para** reflejar la realidad del arriendo.
- **Dado** un contrato vigente próximo a vencer,
- **Cuando** lo renuevo (nueva fecha fin + valor opcional) **o** lo termino (normal/anticipado),
- **Entonces** en renovación se agregan períodos con numeración continua; en término la propiedad vuelve a `disponible`, se cancelan los períodos futuros y se calcula la multa/garantía informativa.

### HU-B4 — Validar contrato con IA (RF-CONT-09) 🟡 ✅
**Como** corredor, **quiero** que una IA revise el contrato **para** detectar cláusulas faltantes o riesgos antes de firmar.
- **Dado** el texto o PDF del contrato,
- **Cuando** ejecuto la validación,
- **Entonces** obtengo un veredicto (`aprobado`/`con_alertas`/`requiere_revisión`) con las alertas, y puedo confirmar a pesar de alertas (queda registrado).

---

## Épica C — Corredor: cobros y liquidación (núcleo)

### HU-C1 — Conciliar un pago (RF-COB-01..03) 🔴 ✅
**Como** corredor, **quiero** registrar un pago con su fecha real **para** conciliar sin intereses fantasma.
- **Dado** un período pendiente,
- **Cuando** simulo/registro el pago con su fecha real,
- **Entonces** el período queda `pagado` con esa fecha, se emite voucher, se registra en el ledger y —si es contrato CLP con reajuste activo en ese período— se **aplica el reajuste IPC**.

### HU-C2 — Cerrar liquidación con ajustes (RF-COB-04..06) 🔴 ✅
**Como** corredor, **quiero** cerrar la liquidación agregando ajustes **para** liquidar al propietario en pocos clics.
- **Dado** un período pagado,
- **Cuando** agrego ajustes (p. ej. descuento por reparación) y cierro,
- **Entonces** se calculan comisión + ajustes + liquidación, se emite el voucher de liquidación y todo queda como asientos inmutables.

### HU-C3 — Gestionar garantía y deuda (RF-COB-07, RF-COB-08) 🟡 ✅
**Como** corredor, **quiero** retener/devolver la garantía y emitir un reconocimiento de deuda **para** cerrar el arriendo con respaldo.
- **Dado** un contrato con garantía,
- **Cuando** lo termino con descuentos por daños,
- **Entonces** se registran asientos de retención/devolución (tope 2 rentas) y puedo generar el documento de reconocimiento de deuda desde el ledger.

---

## Épica D — Arrendatario / Propietario: portal

### HU-D1 — Consultar mi arriendo (RF-PORTAL-01..03) 🔴 ✅
**Como** arrendatario, **quiero** consultar mi arriendo con mi RUT **para** ver mis pagos sin crear cuenta.
- **Dado** que ingreso mi RUT en `/portal`,
- **Cuando** valido el código OTP enviado a mi contacto registrado,
- **Entonces** accedo (solo lectura, 30 min) y veo mi contrato, calendario y estado; si llevo > 1 año, puedo **filtrar los pagos por año**.

### HU-D2 — Descargar mis documentos (RF-PORTAL-04) 🟡 ✅
**Como** arrendatario, **quiero** descargar mi contrato y comprobantes **para** tener respaldo.
- **Dado** que tengo sesión de portal,
- **Cuando** descargo un documento,
- **Entonces** solo obtengo documentos de **mi** contrato, el acceso queda auditado y el archivo no se cachea.

### HU-D3 — Recibir mensajes del corredor (RF-COM-01, RF-PORTAL-05) 🟡 ✅
**Como** arrendatario, **quiero** ver los mensajes del corredor **para** enterarme de información importante.
- **Dado** que el corredor publica un mensaje (con o sin adjuntos),
- **Cuando** ingreso a mi portal,
- **Entonces** veo el mensaje y su fecha, y recibí un email de aviso.

---

## Épica E — Visitante: marketplace

### HU-E1 — Buscar una propiedad (RF-MKT-01, RF-MKT-02) 🔴 ✅
**Como** interesado, **quiero** filtrar propiedades **para** encontrar un arriendo que me sirva.
- **Dado** que estoy en `/marketplace`,
- **Cuando** aplico filtros (tipo, ubicación, precio, mascotas, etc.),
- **Entonces** veo solo publicaciones `publicada` de propiedades `disponible`, con su ficha y datos.

### HU-E2 — Contactar y valorar al corredor (RF-MKT-03, RF-PORTAL-06) 🟡 ✅
**Como** interesado, **quiero** contactar al corredor y luego valorarlo **para** comunicarme y dar feedback.
- **Dado** que envío el formulario de contacto de una ficha,
- **Cuando** se registra la consulta,
- **Entonces** el corredor recibe la notificación y yo obtengo un **token de valoración de un solo uso**; al valorar (1–5★), el token se quema y no puedo volver a valorar con él.

### HU-E3 — Denunciar un aviso (RF-MKT-04) 🟡 ✅
**Como** interesado, **quiero** denunciar una propiedad o corredor sospechoso **para** ayudar a mantener la plataforma segura.
- **Dado** que abro el formulario de denuncia,
- **Cuando** completo el motivo y acepto las declaraciones obligatorias (veracidad Art. 211 CP + tratamiento de datos),
- **Entonces** la denuncia se registra (puede ser anónima); sin esas declaraciones no puedo enviarla.

---

## Épica F — Sistema

### HU-F1 — Enviar recordatorios (RF-COM-03) 🔴 ✅
**Como** sistema, **quiero** generar y enviar recordatorios de vencimiento **para** que las partes paguen a tiempo.
- **Dado** el scheduler externo con `CRON_SECRET`,
- **Cuando** se invoca `/api/cron/recordatorios`,
- **Entonces** se generan/envían los recordatorios de todos los tenants según la cadencia (5 días antes, día de vencimiento, 3 días después).

---

> Prioridades y estado global: [gestion/PROGRESO.md](../gestion/PROGRESO.md). Recorridos visuales: [flujos-y-navegacion.md](flujos-y-navegacion.md).
