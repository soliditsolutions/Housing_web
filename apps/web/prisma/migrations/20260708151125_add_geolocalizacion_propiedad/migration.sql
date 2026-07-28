-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('admin', 'operador');

-- CreateEnum
CREATE TYPE "TipoPropiedad" AS ENUM ('casa', 'departamento', 'cabana');

-- CreateEnum
CREATE TYPE "EstadoPropiedad" AS ENUM ('borrador', 'disponible', 'reservada', 'arrendada');

-- CreateEnum
CREATE TYPE "Denominacion" AS ENUM ('UF', 'CLP');

-- CreateEnum
CREATE TYPE "FrecuenciaReajuste" AS ENUM ('anual', 'semestral', 'ninguna');

-- CreateEnum
CREATE TYPE "EstadoContrato" AS ENUM ('borrador', 'vigente', 'terminado', 'terminado_anticipado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoPeriodo" AS ENUM ('pendiente', 'pagado', 'liquidado', 'atrasado', 'en_revision', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoPublicacion" AS ENUM ('borrador', 'publicada', 'bajada');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('activa', 'cancelada', 'convertida');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('en_revision', 'conciliado', 'anulado');

-- CreateEnum
CREATE TYPE "CanalPago" AS ENUM ('PAC', 'pago_facil', 'transferencia_declarada', 'otro');

-- CreateEnum
CREATE TYPE "TipoConcepto" AS ENUM ('arriendo', 'gasto_comun', 'interes', 'multa', 'ajuste', 'garantia');

-- CreateEnum
CREATE TYPE "TipoAjuste" AS ENUM ('descuento_propietario', 'cargo_arrendatario', 'retencion');

-- CreateEnum
CREATE TYPE "TipoVoucher" AS ENUM ('pago', 'liquidacion');

-- CreateEnum
CREATE TYPE "TipoAsiento" AS ENUM ('CARGO_ARRIENDO', 'CARGO_GASTO_COMUN', 'CARGO_INTERES', 'CARGO_MULTA', 'CARGO_AJUSTE', 'PAGO_RECIBIDO', 'COMISION_CORREDOR', 'AJUSTE_LIQUIDACION', 'LIQUIDACION_PROPIETARIO', 'GARANTIA_RECIBIDA', 'RETENCION_GARANTIA', 'DEVOLUCION_GARANTIA');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('cobro', 'voucher_pago', 'recordatorio_vencimiento', 'liquidacion_propietario', 'salida_anticipada', 'termino_contrato', 'nuevo_contrato', 'solicitud_firma', 'renovacion_contrato', 'comentario_corredor');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('email');

-- CreateEnum
CREATE TYPE "EstadoNotificacion" AS ENUM ('pendiente', 'simulada', 'enviada');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('contrato', 'anexo', 'comprobante_pago', 'certificado_reserva', 'reconocimiento_deuda', 'otro');

-- CreateEnum
CREATE TYPE "CanalOtp" AS ENUM ('email', 'sms');

-- CreateEnum
CREATE TYPE "TipoDenuncia" AS ENUM ('fraude_inmobiliario', 'estafa', 'informacion_falsa', 'acoso', 'discriminacion', 'incumplimiento', 'otro');

-- CreateEnum
CREATE TYPE "ObjetivoDenuncia" AS ENUM ('propiedad', 'corredor');

-- CreateTable
CREATE TABLE "tenant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "rut" TEXT,
    "plan" TEXT,
    "email_contacto" TEXT,
    "ventana_liquidacion_dias" SMALLINT NOT NULL DEFAULT 10,
    "recordatorio_dias_antes" SMALLINT NOT NULL DEFAULT 5,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'operador',
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rut" TEXT,
    "telefono" TEXT,
    "fecha_nacimiento" DATE,
    "direccion" TEXT,
    "ciudad" TEXT,
    "region" TEXT,
    "foto_perfil" TEXT,
    "perfil_completo" BOOLEAN NOT NULL DEFAULT false,
    "password_hash" TEXT,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "consent_given_at" TIMESTAMPTZ(6),
    "consent_version" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "rut" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "canal_acceso_pref" "CanalOtp",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propiedad" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "propietario_id" UUID NOT NULL,
    "tipo" "TipoPropiedad" NOT NULL,
    "estado" "EstadoPropiedad" NOT NULL DEFAULT 'borrador',
    "direccion" TEXT NOT NULL,
    "comuna" TEXT,
    "region" TEXT,
    "orientacion" TEXT,
    "antiguedad_anios" INTEGER,
    "m2_construidos" DECIMAL(8,2),
    "m2_totales" DECIMAL(8,2),
    "es_condominio" BOOLEAN NOT NULL DEFAULT false,
    "plantas" SMALLINT,
    "piezas" SMALLINT,
    "banos" SMALLINT,
    "estacionamientos" SMALLINT,
    "paga_gastos_comunes" BOOLEAN NOT NULL DEFAULT false,
    "valor_gastos_comunes" DECIMAL(14,0),
    "acepta_mascotas" BOOLEAN NOT NULL DEFAULT false,
    "otras_descripciones" TEXT,
    "latitud" DECIMAL(9,6),
    "longitud" DECIMAL(9,6),
    "mostrar_ubicacion_exacta" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propiedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imagen_propiedad" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "propiedad_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "orden" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagen_propiedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publicacion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "propiedad_id" UUID NOT NULL,
    "estado" "EstadoPublicacion" NOT NULL DEFAULT 'borrador',
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio_referencia" DECIMAL(14,4),
    "denominacion_precio" "Denominacion",
    "publicada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserva" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "propiedad_id" UUID NOT NULL,
    "persona_id" UUID,
    "fecha_reserva" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigente_hasta" DATE,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'activa',
    "notas" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrato" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "propiedad_id" UUID NOT NULL,
    "arrendatario_id" UUID NOT NULL,
    "propietario_id" UUID NOT NULL,
    "estado" "EstadoContrato" NOT NULL DEFAULT 'borrador',
    "denominacion" "Denominacion" NOT NULL,
    "valor_arriendo" DECIMAL(14,4) NOT NULL,
    "dia_vencimiento" SMALLINT NOT NULL,
    "comision_corredor_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "reajuste" "FrecuenciaReajuste" NOT NULL DEFAULT 'anual',
    "mora_tasa_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "mora_dias_gracia" SMALLINT NOT NULL DEFAULT 0,
    "multa_meses" DECIMAL(4,2) NOT NULL DEFAULT 0,
    "cobra_gasto_comun" BOOLEAN NOT NULL DEFAULT false,
    "garantia_meses" DECIMAL(3,1) NOT NULL DEFAULT 0,
    "garantia_monto_clp" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "fecha_termino" DATE,
    "validacion_ia" JSONB,
    "validacion_estado" TEXT,
    "validacion_at" TIMESTAMPTZ(6),
    "validacion_confirmada_at" TIMESTAMPTZ(6),
    "token_valoracion" UUID,
    "valoracion_dada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "periodo_pago" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contrato_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_vencimiento" DATE NOT NULL,
    "monto_base" DECIMAL(14,4) NOT NULL,
    "monto_gasto_comun" DECIMAL(14,0) NOT NULL DEFAULT 0,
    "estado" "EstadoPeriodo" NOT NULL DEFAULT 'pendiente',
    "fecha_pago_real" DATE,

    CONSTRAINT "periodo_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajuste_liquidacion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "periodo_id" UUID NOT NULL,
    "tipo" "TipoAjuste" NOT NULL,
    "monto_clp" DECIMAL(14,0) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "creado_por" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ajuste_liquidacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago_entrante" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contrato_id" UUID,
    "periodo_id" UUID,
    "monto_clp" DECIMAL(14,0) NOT NULL,
    "fecha_pago_real" DATE NOT NULL,
    "canal" "CanalPago" NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'en_revision',
    "comprobante_url" TEXT,
    "declaracion_jurada" BOOLEAN NOT NULL DEFAULT false,
    "declarado_por" UUID,
    "confirmado_por" UUID,
    "confirmado_en" TIMESTAMPTZ(6),
    "origen" TEXT NOT NULL DEFAULT 'simulado',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pago_entrante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asiento_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contrato_id" UUID NOT NULL,
    "periodo_id" UUID,
    "arrendatario_id" UUID NOT NULL,
    "propietario_id" UUID NOT NULL,
    "tipo" "TipoAsiento" NOT NULL,
    "concepto" "TipoConcepto",
    "signo" SMALLINT NOT NULL DEFAULT 1,
    "monto_clp" DECIMAL(14,0) NOT NULL,
    "moneda_origen" "Denominacion",
    "valor_origen" DECIMAL(14,4),
    "uf_aplicada" DECIMAL(12,2),
    "fecha_evento" DATE NOT NULL,
    "descripcion" TEXT,
    "reversa_de" UUID,
    "pago_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asiento_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contrato_id" UUID NOT NULL,
    "periodo_id" UUID,
    "arrendatario_id" UUID NOT NULL,
    "tipo" "TipoVoucher" NOT NULL,
    "monto_clp" DECIMAL(14,0) NOT NULL,
    "fecha" DATE NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "contrato_id" UUID,
    "tipo" "TipoNotificacion" NOT NULL,
    "canal" "CanalNotificacion" NOT NULL DEFAULT 'email',
    "estado" "EstadoNotificacion" NOT NULL DEFAULT 'pendiente',
    "asunto" TEXT NOT NULL,
    "cuerpo" TEXT,
    "payload" JSONB,
    "enviada_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "contrato_id" UUID,
    "propiedad_id" UUID,
    "periodo_id" UUID,
    "voucher_id" UUID,
    "reserva_id" UUID,
    "comentario_id" UUID,
    "nombre" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acceso_otp" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "propiedad_id" UUID NOT NULL,
    "canal" "CanalOtp" NOT NULL,
    "codigo_hash" TEXT NOT NULL,
    "expira_en" TIMESTAMPTZ(6) NOT NULL,
    "intentos" SMALLINT NOT NULL DEFAULT 0,
    "max_intentos" SMALLINT NOT NULL DEFAULT 5,
    "usado_en" TIMESTAMPTZ(6),
    "ip_solicitud" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acceso_otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acceso_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "persona_id" UUID,
    "accion" TEXT NOT NULL,
    "documento_id" UUID,
    "ip" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acceso_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivo_confiable" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "nombre" TEXT NOT NULL,
    "ip_creacion" TEXT,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivo_confiable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigo_dispositivo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "codigo_hash" CHAR(64) NOT NULL,
    "device_token" UUID NOT NULL,
    "expira_at" TIMESTAMPTZ(6) NOT NULL,
    "intentos" SMALLINT NOT NULL DEFAULT 0,
    "usado_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigo_dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reset_token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "usado_en" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reset_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serie_uf" (
    "fecha" DATE NOT NULL,
    "valor_clp" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "serie_uf_pkey" PRIMARY KEY ("fecha")
);

-- CreateTable
CREATE TABLE "serie_ipc" (
    "periodo" DATE NOT NULL,
    "indice" DECIMAL(10,4) NOT NULL,

    CONSTRAINT "serie_ipc_pkey" PRIMARY KEY ("periodo")
);

-- CreateTable
CREATE TABLE "consulta_contacto" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "publicacion_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "quiere_contacto" BOOLEAN NOT NULL DEFAULT true,
    "via_email" BOOLEAN NOT NULL DEFAULT true,
    "via_telefono" BOOLEAN NOT NULL DEFAULT false,
    "token_valoracion" UUID NOT NULL,
    "valoracion_dada" BOOLEAN NOT NULL DEFAULT false,
    "ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consulta_contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "denuncia" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipo" "TipoDenuncia" NOT NULL,
    "objetivo" "ObjetivoDenuncia" NOT NULL,
    "publicacion_id" UUID,
    "nombre_corredor" TEXT,
    "descripcion" TEXT NOT NULL,
    "evidencia_descripcion" TEXT,
    "es_anonima" BOOLEAN NOT NULL DEFAULT false,
    "nombre_denunciante" TEXT,
    "apellido_denunciante" TEXT,
    "email_denunciante" TEXT,
    "declara_veracidad" BOOLEAN NOT NULL,
    "acepta_tratamiento_datos" BOOLEAN NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'recibida',
    "ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "denuncia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentario_corredor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "contrato_id" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "usuario_nombre" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentario_corredor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valoracion_corredor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "consulta_id" UUID,
    "contrato_id" UUID,
    "nombre" TEXT NOT NULL DEFAULT '',
    "apellido" TEXT NOT NULL DEFAULT '',
    "estrellas" SMALLINT NOT NULL,
    "comentario" TEXT,
    "es_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valoracion_corredor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usuario_tenant_id_idx" ON "usuario"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_rut_key" ON "usuario"("rut");

-- CreateIndex
CREATE INDEX "persona_tenant_id_idx" ON "persona"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "persona_tenant_id_rut_key" ON "persona"("tenant_id", "rut");

-- CreateIndex
CREATE INDEX "propiedad_tenant_id_idx" ON "propiedad"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "contrato_token_valoracion_key" ON "contrato"("token_valoracion");

-- CreateIndex
CREATE INDEX "contrato_tenant_id_idx" ON "contrato"("tenant_id");

-- CreateIndex
CREATE INDEX "periodo_pago_tenant_id_idx" ON "periodo_pago"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "periodo_pago_contrato_id_numero_key" ON "periodo_pago"("contrato_id", "numero");

-- CreateIndex
CREATE INDEX "ajuste_liquidacion_tenant_id_idx" ON "ajuste_liquidacion"("tenant_id");

-- CreateIndex
CREATE INDEX "ajuste_liquidacion_periodo_id_idx" ON "ajuste_liquidacion"("periodo_id");

-- CreateIndex
CREATE INDEX "asiento_ledger_tenant_id_idx" ON "asiento_ledger"("tenant_id");

-- CreateIndex
CREATE INDEX "asiento_ledger_contrato_id_idx" ON "asiento_ledger"("contrato_id");

-- CreateIndex
CREATE INDEX "asiento_ledger_periodo_id_idx" ON "asiento_ledger"("periodo_id");

-- CreateIndex
CREATE INDEX "notificacion_tenant_id_idx" ON "notificacion"("tenant_id");

-- CreateIndex
CREATE INDEX "notificacion_persona_id_idx" ON "notificacion"("persona_id");

-- CreateIndex
CREATE INDEX "documento_tenant_id_idx" ON "documento"("tenant_id");

-- CreateIndex
CREATE INDEX "documento_contrato_id_idx" ON "documento"("contrato_id");

-- CreateIndex
CREATE INDEX "acceso_otp_persona_id_idx" ON "acceso_otp"("persona_id");

-- CreateIndex
CREATE INDEX "dispositivo_confiable_usuario_id_idx" ON "dispositivo_confiable"("usuario_id");

-- CreateIndex
CREATE INDEX "dispositivo_confiable_token_hash_idx" ON "dispositivo_confiable"("token_hash");

-- CreateIndex
CREATE INDEX "codigo_dispositivo_usuario_id_idx" ON "codigo_dispositivo"("usuario_id");

-- CreateIndex
CREATE INDEX "reset_token_token_hash_idx" ON "reset_token"("token_hash");

-- CreateIndex
CREATE INDEX "reset_token_usuario_id_idx" ON "reset_token"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "consulta_contacto_token_valoracion_key" ON "consulta_contacto"("token_valoracion");

-- CreateIndex
CREATE INDEX "consulta_contacto_tenant_id_idx" ON "consulta_contacto"("tenant_id");

-- CreateIndex
CREATE INDEX "consulta_contacto_publicacion_id_idx" ON "consulta_contacto"("publicacion_id");

-- CreateIndex
CREATE INDEX "denuncia_publicacion_id_idx" ON "denuncia"("publicacion_id");

-- CreateIndex
CREATE INDEX "comentario_corredor_tenant_id_idx" ON "comentario_corredor"("tenant_id");

-- CreateIndex
CREATE INDEX "comentario_corredor_contrato_id_idx" ON "comentario_corredor"("contrato_id");

-- CreateIndex
CREATE UNIQUE INDEX "valoracion_corredor_consulta_id_key" ON "valoracion_corredor"("consulta_id");

-- CreateIndex
CREATE UNIQUE INDEX "valoracion_corredor_contrato_id_key" ON "valoracion_corredor"("contrato_id");

-- CreateIndex
CREATE INDEX "valoracion_corredor_tenant_id_idx" ON "valoracion_corredor"("tenant_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona" ADD CONSTRAINT "persona_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propiedad" ADD CONSTRAINT "propiedad_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propiedad" ADD CONSTRAINT "propiedad_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagen_propiedad" ADD CONSTRAINT "imagen_propiedad_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagen_propiedad" ADD CONSTRAINT "imagen_propiedad_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publicacion" ADD CONSTRAINT "publicacion_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_arrendatario_id_fkey" FOREIGN KEY ("arrendatario_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodo_pago" ADD CONSTRAINT "periodo_pago_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodo_pago" ADD CONSTRAINT "periodo_pago_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajuste_liquidacion" ADD CONSTRAINT "ajuste_liquidacion_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajuste_liquidacion" ADD CONSTRAINT "ajuste_liquidacion_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodo_pago"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajuste_liquidacion" ADD CONSTRAINT "ajuste_liquidacion_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_entrante" ADD CONSTRAINT "pago_entrante_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_entrante" ADD CONSTRAINT "pago_entrante_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_entrante" ADD CONSTRAINT "pago_entrante_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodo_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_entrante" ADD CONSTRAINT "pago_entrante_declarado_por_fkey" FOREIGN KEY ("declarado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pago_entrante" ADD CONSTRAINT "pago_entrante_confirmado_por_fkey" FOREIGN KEY ("confirmado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asiento_ledger" ADD CONSTRAINT "asiento_ledger_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asiento_ledger" ADD CONSTRAINT "asiento_ledger_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asiento_ledger" ADD CONSTRAINT "asiento_ledger_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodo_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asiento_ledger" ADD CONSTRAINT "asiento_ledger_arrendatario_id_fkey" FOREIGN KEY ("arrendatario_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asiento_ledger" ADD CONSTRAINT "asiento_ledger_propietario_id_fkey" FOREIGN KEY ("propietario_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asiento_ledger" ADD CONSTRAINT "asiento_ledger_reversa_de_fkey" FOREIGN KEY ("reversa_de") REFERENCES "asiento_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asiento_ledger" ADD CONSTRAINT "asiento_ledger_pago_id_fkey" FOREIGN KEY ("pago_id") REFERENCES "pago_entrante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodo_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher" ADD CONSTRAINT "voucher_arrendatario_id_fkey" FOREIGN KEY ("arrendatario_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodo_pago"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "voucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reserva"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_comentario_id_fkey" FOREIGN KEY ("comentario_id") REFERENCES "comentario_corredor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceso_otp" ADD CONSTRAINT "acceso_otp_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceso_otp" ADD CONSTRAINT "acceso_otp_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceso_otp" ADD CONSTRAINT "acceso_otp_propiedad_id_fkey" FOREIGN KEY ("propiedad_id") REFERENCES "propiedad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceso_log" ADD CONSTRAINT "acceso_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceso_log" ADD CONSTRAINT "acceso_log_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acceso_log" ADD CONSTRAINT "acceso_log_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivo_confiable" ADD CONSTRAINT "dispositivo_confiable_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigo_dispositivo" ADD CONSTRAINT "codigo_dispositivo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reset_token" ADD CONSTRAINT "reset_token_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta_contacto" ADD CONSTRAINT "consulta_contacto_publicacion_id_fkey" FOREIGN KEY ("publicacion_id") REFERENCES "publicacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta_contacto" ADD CONSTRAINT "consulta_contacto_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denuncia" ADD CONSTRAINT "denuncia_publicacion_id_fkey" FOREIGN KEY ("publicacion_id") REFERENCES "publicacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentario_corredor" ADD CONSTRAINT "comentario_corredor_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentario_corredor" ADD CONSTRAINT "comentario_corredor_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contrato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoracion_corredor" ADD CONSTRAINT "valoracion_corredor_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoracion_corredor" ADD CONSTRAINT "valoracion_corredor_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consulta_contacto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoracion_corredor" ADD CONSTRAINT "valoracion_corredor_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contrato"("id") ON DELETE SET NULL ON UPDATE CASCADE;
