"use client";

import { startTransition, useRef, useState } from "react";
import { useActionState }  from "react";
import Link                from "next/link";
import {
  Eye, EyeOff, AlertCircle, Shield, Upload, X, CheckCircle2,
} from "lucide-react";
import { registroAction }         from "./actions";
import { evaluatePassword }       from "@/lib/password-strength";
import { validateRut, formatRut } from "@/lib/rut";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

/* ── Medidor de fuerza de contraseña ─────────────────────────────────────── */
function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const s = evaluatePassword(password);
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all duration-200"
            style={{ background: i <= s.score ? s.color : "var(--hw-border-2)" }}
          />
        ))}
      </div>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold shrink-0" style={{ color: s.color }}>
          {s.label}
        </span>
        <span className="text-xs text-right" style={{ color: "var(--hw-text-4)" }}>
          {s.suggestion}
        </span>
      </div>
    </div>
  );
}

/* ── Estilos de input reutilizables ─────────────────────────────────────── */
const inputBase: React.CSSProperties = {
  height:       "44px",
  width:        "100%",
  borderRadius: "12px",
  background:   "var(--hw-glass-input)",
  color:        "var(--hw-text-1)",
  fontSize:     "14px",
  padding:      "0 14px",
  outline:      "none",
  boxShadow:    "var(--hw-input-shadow)",
  transition:   "border-color 150ms ease, box-shadow 150ms ease",
};

function inputStyle(hasError: boolean, disabled?: boolean): React.CSSProperties {
  return {
    ...inputBase,
    border:  `1px solid ${hasError ? "var(--hw-danger)" : "var(--hw-border-2)"}`,
    opacity: disabled ? 0.6 : 1,
  };
}

function onFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "var(--hw-primary)";
  e.currentTarget.style.boxShadow   = "var(--hw-input-shadow-focus)";
}

function makeOnBlur(hasError: boolean) {
  return (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = hasError ? "var(--hw-danger)" : "var(--hw-border-2)";
    e.currentTarget.style.boxShadow   = "var(--hw-input-shadow)";
  };
}

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES        = 5 * 1024 * 1024;

/* ── Contenido del diálogo de verificación de carnet ─────────────────────── */
// FIX UI-C7: refactor a Dialog de @base-ui/react.
// El Popup gestiona automáticamente role="dialog", aria-modal="true",
// aria-labelledby (apunta a DialogTitle) y el focus trap.
function CarnetModalBody({
  onConfirmar,
}: {
  onConfirmar: (file: File) => void;
}) {
  const [carnetFile,    setCarnetFile]    = useState<File | null>(null);
  const [carnetPreview, setCarnetPreview] = useState<string | null>(null);
  const [dragOver,      setDragOver]      = useState(false);
  const [fileError,     setFileError]     = useState<string | null>(null);

  function procesarArchivo(file: File) {
    setFileError(null);
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      setFileError("Solo se aceptan imágenes JPG, PNG o WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError("La imagen no puede superar los 5 MB.");
      return;
    }
    setCarnetFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCarnetPreview(ev.target?.result as string ?? null);
    reader.readAsDataURL(file);
  }

  function limpiar() {
    setCarnetFile(null);
    setCarnetPreview(null);
    setFileError(null);
  }

  return (
    <>
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4 p-6 pb-0">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--hw-primary-lt)" }}
          >
            <Shield className="h-6 w-6" style={{ color: "var(--hw-primary)" }} aria-hidden="true" />
          </div>
          <div>
            <DialogTitle
              className="text-base font-semibold leading-none"
              style={{ color: "var(--hw-text-1)" }}
            >
              Verificación de identidad
            </DialogTitle>
            <DialogDescription
              className="mt-1 text-xs"
              style={{ color: "var(--hw-text-3)" }}
            >
              Requerida para crear tu cuenta
            </DialogDescription>
          </div>
        </div>
        <DialogClose
          aria-label="Cerrar modal de verificación"
          className="hw-btn hw-tap-target relative rounded-lg p-1.5 transition-colors"
          style={{ color: "var(--hw-text-4)" }}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </DialogClose>
      </div>

      <div className="space-y-4 p-6">
        {/* Explicación */}
        <p className="text-sm leading-relaxed" style={{ color: "var(--hw-text-2)" }}>
          Para prevenir usurpación de identidad, verificamos que el{" "}
          <strong>RUT y nombre ingresados</strong> correspondan a tu documento.
          Sube una foto clara del{" "}
          <strong>frontis de tu Cédula de Identidad chilena</strong>.
        </p>

        {/* Zona de carga o previsualización */}
        {!carnetPreview ? (
          <label
            className="flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer"
            style={{
              height:     "156px",
              border:     `2px dashed ${dragOver ? "var(--hw-primary)" : "var(--hw-border-2)"}`,
              background: dragOver ? "var(--hw-primary-lt)" : "var(--hw-page)",
            }}
            onDragOver={(e)  => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={()  => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) procesarArchivo(f);
            }}
          >
            <Upload
              className="mb-2 h-8 w-8"
              style={{ color: dragOver ? "var(--hw-primary)" : "var(--hw-text-4)" }}
              aria-hidden="true"
            />
            <span
              className="text-sm font-medium"
              style={{ color: dragOver ? "var(--hw-primary)" : "var(--hw-text-1)" }}
            >
              Arrastra tu carnet o haz clic aquí
            </span>
            <span className="mt-1 text-xs" style={{ color: "var(--hw-text-4)" }}>
              JPG, PNG o WEBP · Máx. 5 MB
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Subir imagen del carnet de identidad"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) procesarArchivo(f);
                e.target.value = "";
              }}
            />
          </label>
        ) : (
          <div className="space-y-2">
            <div
              className="relative overflow-hidden rounded-xl"
              style={{ height: "156px", background: "var(--hw-page)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={carnetPreview}
                alt="Vista previa del carnet"
                className="h-full w-full object-contain"
              />
              <div
                className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                style={{ background: "var(--hw-success-lt)", color: "var(--hw-success-dk)" }}
              >
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Imagen cargada
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="truncate text-xs" style={{ color: "var(--hw-text-3)" }}>
                {carnetFile?.name}
              </span>
              <button
                type="button"
                onClick={limpiar}
                className="ml-2 shrink-0 text-xs font-medium"
                style={{ color: "var(--hw-danger)" }}
              >
                Cambiar imagen
              </button>
            </div>
          </div>
        )}

        {/* Error de archivo */}
        {fileError && (
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs"
            role="alert"
            style={{
              background: "var(--hw-danger-lt)",
              color:      "var(--hw-danger)",
              border:     "1px solid var(--hw-danger-bd)",
            }}
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {fileError}
          </div>
        )}

        {/* Nota de privacidad */}
        <p className="text-xs leading-relaxed" style={{ color: "var(--hw-text-4)" }}>
          🔒 La imagen se analiza con IA exclusivamente para verificar que el RUT y
          nombre coincidan. No se almacena ni se comparte con terceros.
        </p>

        {/* Botones */}
        <div className="flex gap-3">
          <DialogClose
            className="flex-1 rounded-xl px-4 py-3 text-sm font-medium hw-btn transition-colors"
            style={{
              background: "var(--hw-page)",
              color:      "var(--hw-text-2)",
              border:     "1px solid var(--hw-border-2)",
            }}
          >
            Cancelar
          </DialogClose>
          <button
            type="button"
            onClick={() => carnetFile && onConfirmar(carnetFile)}
            disabled={!carnetFile}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: "var(--hw-primary)" }}
          >
            Verificar y crear cuenta
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Componente principal ─────────────────────────────────────────────────── */
export function RegistroForm() {
  const [state, formAction, pending] = useActionState(registroAction, null);
  const [showPwd, setShowPwd]            = useState(false);
  const [password, setPassword]          = useState("");
  const [rut, setRut]                    = useState("");
  const [modalOpen, setModalOpen]        = useState(false);
  const [clientErrors, setClientErrors]  = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const rutClientError = rut.length > 3 && !validateRut(rut) ? "RUT inválido" : null;

  const nombreErr  = clientErrors.nombre || (state?.field === "nombre" ? state.error : null) || null;
  const rutErr     = rutClientError || clientErrors.rut || (state?.field === "rut" ? state.error : null) || null;
  const emailErr   = clientErrors.email  || (state?.field === "email"  ? state.error : null) || null;
  const empresaErr = clientErrors.empresa || null;
  const passwordErr = clientErrors.password || null;
  const consentErr  = clientErrors.consent  || null;

  function handleRutChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9kK]/g, "");
    setRut(raw.length > 1 ? formatRut(raw) : raw);
    if (clientErrors.rut) setClientErrors((p) => ({ ...p, rut: "" }));
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;

    const fd      = new FormData(formRef.current);
    const nombre  = (fd.get("nombre")?.toString() ?? "").trim();
    const email   = (fd.get("email")?.toString() ?? "").trim();
    const empresa = (fd.get("empresa")?.toString() ?? "").trim();
    const consent = fd.get("consent")?.toString();

    const errs: Record<string, string> = {};
    if (!nombre || nombre.length < 2)
      errs.nombre = "Ingresa tu nombre completo (mínimo 2 caracteres).";
    if (!rut || !validateRut(rut))
      errs.rut = "El RUT no es válido. Verifica el dígito verificador.";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Ingresa un correo electrónico válido.";
    if (!empresa || empresa.length < 2)
      errs.empresa = "Ingresa el nombre de tu corredora (mínimo 2 caracteres).";
    if (!password || !evaluatePassword(password).passes)
      errs.password = "La contraseña es demasiado débil. Usa al menos 15 caracteres.";
    if (!consent)
      errs.consent = "Debes aceptar los Términos de uso y la Política de privacidad.";

    if (Object.keys(errs).length > 0) {
      setClientErrors(errs);
      const firstField = ["nombre", "rut", "email", "empresa", "password", "consent"].find(
        (f) => errs[f],
      );
      if (firstField) {
        document.getElementById(firstField === "password" ? "reg-password" : firstField)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setClientErrors({});
    setModalOpen(true);
  }

  function handleConfirmar(carnetFile: File) {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.append("carnet", carnetFile);
    setModalOpen(false);
    startTransition(() => formAction(fd));
  }

  return (
    <>
      <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-4" noValidate>

        {/* Nombre completo */}
        <div className="space-y-1.5">
          <label htmlFor="nombre" className="block text-sm font-semibold" style={{ color: "var(--hw-text-2)" }}>
            Nombre completo
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            autoComplete="name"
            required
            placeholder="Juan García López"
            disabled={pending}
            aria-invalid={nombreErr ? true : undefined}
            aria-describedby={nombreErr ? "nombre-error" : "nombre-hint"}
            style={inputStyle(!!nombreErr, pending)}
            onFocus={onFocus}
            onBlur={makeOnBlur(!!nombreErr)}
            onChange={() => { if (clientErrors.nombre) setClientErrors((p) => ({ ...p, nombre: "" })); }}
          />
          <p id="nombre-hint" className="text-xs" style={{ color: "var(--hw-text-4)" }}>
            Ingresa tu nombre tal como aparece en tu Cédula de Identidad.
          </p>
          {nombreErr && (
            <p id="nombre-error" role="alert" className="text-xs" style={{ color: "var(--hw-danger)" }}>
              {nombreErr}
            </p>
          )}
        </div>

        {/* RUT */}
        <div className="space-y-1.5">
          <label htmlFor="rut" className="block text-sm font-semibold" style={{ color: "var(--hw-text-2)" }}>
            RUT
          </label>
          <input
            id="rut"
            name="rut"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            placeholder="12.345.678-9"
            maxLength={12}
            value={rut}
            onChange={handleRutChange}
            disabled={pending}
            aria-invalid={rutErr ? true : undefined}
            aria-describedby={rutErr ? "rut-error" : undefined}
            style={inputStyle(!!rutErr, pending)}
            onFocus={onFocus}
            onBlur={makeOnBlur(!!rutErr)}
          />
          {rutErr && (
            <p id="rut-error" role="alert" className="text-xs" style={{ color: "var(--hw-danger)" }}>
              {rutErr}
            </p>
          )}
        </div>

        {/* Correo electrónico */}
        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="block text-sm font-semibold" style={{ color: "var(--hw-text-2)" }}>
            Correo electrónico
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="correo@empresa.cl"
            disabled={pending}
            aria-invalid={emailErr ? true : undefined}
            aria-describedby={emailErr ? "email-error" : undefined}
            style={inputStyle(!!emailErr, pending)}
            onFocus={onFocus}
            onBlur={makeOnBlur(!!emailErr)}
            onChange={() => { if (clientErrors.email) setClientErrors((p) => ({ ...p, email: "" })); }}
          />
          {emailErr && (
            <p id="email-error" role="alert" className="text-xs" style={{ color: "var(--hw-danger)" }}>
              {emailErr}
            </p>
          )}
        </div>

        {/* Nombre de la corredora */}
        <div className="space-y-1.5">
          <label htmlFor="empresa" className="block text-sm font-semibold" style={{ color: "var(--hw-text-2)" }}>
            Nombre de la corredora
          </label>
          <input
            id="empresa"
            name="empresa"
            type="text"
            autoComplete="organization"
            required
            placeholder="Corredora del Sur SpA"
            disabled={pending}
            aria-invalid={empresaErr ? true : undefined}
            aria-describedby={empresaErr ? "empresa-error" : undefined}
            style={inputStyle(!!empresaErr, pending)}
            onFocus={onFocus}
            onBlur={makeOnBlur(!!empresaErr)}
            onChange={() => { if (clientErrors.empresa) setClientErrors((p) => ({ ...p, empresa: "" })); }}
          />
          {empresaErr && (
            <p id="empresa-error" role="alert" className="text-xs" style={{ color: "var(--hw-danger)" }}>
              {empresaErr}
            </p>
          )}
        </div>

        {/* Contraseña con medidor de fuerza */}
        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="block text-sm font-semibold" style={{ color: "var(--hw-text-2)" }}>
            Contraseña
          </label>
          <div className="relative">
            <input
              id="reg-password"
              name="password"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              required
              placeholder="••••••••••••••••"
              disabled={pending}
              value={password}
              aria-invalid={passwordErr ? true : undefined}
              aria-describedby={passwordErr ? "password-error" : "password-hint"}
              onChange={(e) => {
                setPassword(e.target.value);
                if (clientErrors.password) setClientErrors((p) => ({ ...p, password: "" }));
              }}
              style={{ ...inputStyle(!!passwordErr, pending), padding: "0 44px 0 14px" }}
              onFocus={onFocus}
              onBlur={makeOnBlur(!!passwordErr)}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="hw-tap-target absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "var(--hw-text-4)" }}
            >
              {showPwd
                ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                : <Eye    className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          <div aria-live="polite" aria-atomic="true">
            <PasswordStrengthMeter password={password} />
          </div>
          <p id="password-hint" className="text-xs" style={{ color: "var(--hw-text-4)" }}>
            Mínimo 15 caracteres. Las frases largas son más seguras y fáciles de recordar.
          </p>
          {passwordErr && (
            <p id="password-error" role="alert" className="text-xs" style={{ color: "var(--hw-danger)" }}>
              {passwordErr}
            </p>
          )}
        </div>

        {/* Consentimiento — Ley 21.719 Art. 4: NO premarcado */}
        <div className="space-y-1">
          <div className="flex items-start gap-3 pt-1">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              value="1"
              required
              disabled={pending}
              aria-invalid={consentErr ? true : undefined}
              aria-describedby={consentErr ? "consent-error" : undefined}
              className="mt-0.5 h-4 w-4 rounded shrink-0"
              style={{ accentColor: "var(--hw-primary)", cursor: "pointer" }}
              onChange={() => { if (clientErrors.consent) setClientErrors((p) => ({ ...p, consent: "" })); }}
            />
            <label htmlFor="consent" className="text-xs leading-relaxed cursor-pointer" style={{ color: "var(--hw-text-3)" }}>
              He leído y acepto los{" "}
              <Link href="/terminos-uso" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 font-medium" style={{ color: "var(--hw-primary)" }}>
                Términos de uso
              </Link>
              {" "}y la{" "}
              <Link href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 font-medium" style={{ color: "var(--hw-primary)" }}>
                Política de privacidad
              </Link>
              {" "}conforme a la Ley 21.719.
            </label>
          </div>
          {consentErr && (
            <p id="consent-error" role="alert" className="text-xs" style={{ color: "var(--hw-danger)" }}>
              {consentErr}
            </p>
          )}
        </div>

        {/* Error general */}
        {state?.error && !state.field && (
          <div
            className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm"
            role="alert"
            style={{
              background: "var(--hw-danger-lt)",
              color:      "var(--hw-danger)",
              border:     "1px solid var(--hw-danger-bd)",
            }}
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {state.error}
          </div>
        )}

        {/* Botón principal */}
        <button
          type="submit"
          disabled={pending}
          className="hw-btn-primary w-full justify-center"
          style={{ height: "46px", fontSize: "15px", borderRadius: "12px" }}
          aria-busy={pending}
        >
          {pending ? (
            <>
              <Spinner />
              Verificando identidad…
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" aria-hidden="true" />
              Crear cuenta gratuita
            </>
          )}
        </button>

        {/* Link a login */}
        <p className="text-center text-sm" style={{ color: "var(--hw-text-3)" }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: "var(--hw-primary)" }}>
            Inicia sesión
          </Link>
        </p>
      </form>

      {/* FIX UI-C7: Dialog de verificación de carnet.
          @base-ui/react gestiona automáticamente: role="dialog", aria-modal="true",
          aria-labelledby→DialogTitle, focus trap y cierre con Escape. */}
      <Dialog
        open={modalOpen && !pending}
        onOpenChange={(open) => { if (!open) setModalOpen(false); }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-md gap-0 overflow-hidden p-0"
          style={{ background: "var(--hw-surface)", border: "1px solid var(--hw-border)" }}
        >
          <CarnetModalBody onConfirmar={handleConfirmar} />
        </DialogContent>
      </Dialog>
    </>
  );
}
