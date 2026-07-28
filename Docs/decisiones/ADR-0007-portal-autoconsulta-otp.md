# ADR-0007 — Portal de autoconsulta para partes (acceso sin cuenta vía OTP)

- **Fecha**: 2026-06-04
- **Estado**: Aceptada
- **Validado con**: el cliente

## Contexto
Arrendatario y propietario necesitan ver su arriendo y descargar documentos (contrato, anexos, comprobantes de pago, certificado de reserva), pero **no tienen cuenta en el SaaS** (solo los corredores se autentican, ADR-0005). Se requiere un acceso seguro sin cuenta, exponiendo datos financieros y PII.

## Decisión
Un **portal de autoconsulta de solo lectura** con **autenticación passwordless por OTP** (estándar de mercado: banca, portales de servicios, Airbnb/DocuSign).

### Identificación vs. autenticación
- **RUT + ID de propiedad solo IDENTIFICAN** qué arriendo es; **no son secretos**, no constituyen seguridad.
- **El OTP autentica**: código de un solo uso enviado **solo al contacto registrado** de la persona (`persona.email`/`telefono`, según `canal_acceso_pref`), nunca a un contacto tipeado en el formulario.

### Controles de seguridad
- OTP de 6 dígitos, un solo uso, expira ~10 min, máx. 3–5 intentos y luego bloqueo; rate-limiting por RUT/IP. Se guarda **hasheado**.
- **Anti-enumeración**: respuesta idéntica exista o no el RUT+ID ("si los datos son correctos, te enviamos un código").
- **Sesión** post-OTP: token firmado de **solo lectura**, corta vida (15–30 min), **alcance acotado** a los arriendos de esa persona. Sin acceso al SaaS ni a otro tenant.
- **Documentos por URL firmada y expirable**; nunca enlaces públicos.
- **Auditoría** de todo acceso/descarga (`acceso_log`) — Ley 19.628 / 21.719.

### Alcance por rol
- **Arrendatario**: vivienda + su contrato y anexos + comprobantes (pasados) + calendario/cargos (futuros) + certificado de reserva si aplica. **No** ve comisión ni liquidaciones del propietario.
- **Propietario**: estado de su vivienda + contrato + pagos/liquidaciones recibidas + notificaciones.

## Entidades nuevas
- `documento` (archivos del arriendo, servidos por URL firmada).
- `acceso_otp` (emisión/validación de códigos).
- `acceso_log` (auditoría).
- `persona.canal_acceso_pref` (email/sms).

## Consecuencias
- El plano público suma un portal de autoconsulta (separado del SaaS del corredor).
- Producción: almacenamiento de objetos con URLs firmadas; envío de OTP por email/SMS (simulado en MVP).
- En MVP el OTP y el envío son simulados (código visible en pantalla/log), pero el flujo y los controles se implementan reales.

## Refina
La nota de "consulta del propietario por RUT + ID" de [ADR-0005](ADR-0005-acceso-partes-y-publicacion.md) queda **reemplazada** por este portal con OTP, extendido también al arrendatario y con acceso a documentos.
