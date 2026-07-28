"use server";

import { prisma }          from "@/lib/db";
import { withTenant }      from "@/lib/tenant-db";
import { getSession, signSession, setSessionCookie } from "@/lib/auth";
import { verifyPassword, hashPassword } from "@/lib/password";
import { evaluatePassword }             from "@/lib/password-strength";

class DomainError extends Error {
  constructor(msg: string) { super(msg); this.name = "DomainError"; }
}

// ── Tipos de estado ──────────────────────────────────────────────────────────

export type PerfilState = {
  ok:    true;
  perfilCompleto: boolean;
} | {
  ok:    false;
  error: string;
  field?: string;
} | null;

export type PasswordState = {
  ok:    true;
} | {
  ok:    false;
  error: string;
  field?: string;
} | null;

import { esRegionValida, esComunaValidaEnRegion } from "@housing/core";
import { validateRut, canonicalRut } from "@/lib/rut";

// ── Guardar perfil ───────────────────────────────────────────────────────────

export async function guardarPerfilAction(
  _prev: PerfilState,
  formData: FormData,
): Promise<PerfilState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sesión expirada. Vuelve a iniciar sesión." };

  const rut             = formData.get("rut")?.toString().trim()               ?? "";
  const telefono        = formData.get("telefono")?.toString().trim()          ?? "";
  const fechaNacStr     = formData.get("fechaNacimiento")?.toString().trim()   ?? "";
  const direccion       = formData.get("direccion")?.toString().trim()         ?? "";
  const ciudad          = formData.get("ciudad")?.toString().trim()            ?? "";
  const region          = formData.get("region")?.toString().trim()            ?? "";
  const fotoPerfil      = formData.get("fotoPerfil")?.toString().trim()        ?? "";

  // ── Validaciones ──────────────────────────────────────────────────────────

  if (!rut) {
    return { ok: false, error: "El RUT es obligatorio.", field: "rut" };
  }
  if (!validateRut(rut)) {
    return { ok: false, error: "El RUT no es válido. Verifica el dígito verificador.", field: "rut" };
  }

  // Unicidad: otro usuario ya registrado con ese RUT — usuario.rut es único
  // GLOBAL (no por tenant, ver setup.sql sección 4), así que este chequeo es
  // legítimamente cross-tenant. Igual que en login/registro, se resuelve con
  // una función SECURITY DEFINER de alcance mínimo, no dándole a housing_app
  // acceso directo a leer la tabla usuario completa (ver ADR-0011 Fase 2).
  const rutCanonical = canonicalRut(rut);
  const rutDupeRows = await prisma.$queryRaw<{ existe: boolean }[]>`
    SELECT auth_rut_pertenece_a_otro_usuario(${rutCanonical}, ${session.sub}::uuid) AS existe
  `.catch(() => null);
  if (rutDupeRows?.[0]?.existe) {
    return { ok: false, error: "Este RUT ya está registrado en otra cuenta.", field: "rut" };
  }

  if (!telefono) {
    return { ok: false, error: "El teléfono es obligatorio.", field: "telefono" };
  }
  if (!/^\+?[\d\s\-().]{7,20}$/.test(telefono)) {
    return { ok: false, error: "Formato de teléfono inválido.", field: "telefono" };
  }

  if (!fechaNacStr) {
    return { ok: false, error: "La fecha de nacimiento es obligatoria.", field: "fechaNacimiento" };
  }
  const fechaNac = new Date(fechaNacStr + "T00:00:00Z");
  if (isNaN(fechaNac.getTime())) {
    return { ok: false, error: "Fecha de nacimiento inválida.", field: "fechaNacimiento" };
  }
  // Debe tener al menos 18 años
  const hoy18 = new Date();
  hoy18.setFullYear(hoy18.getFullYear() - 18);
  if (fechaNac > hoy18) {
    return { ok: false, error: "Debes tener al menos 18 años para usar Housing.", field: "fechaNacimiento" };
  }

  if (!direccion) {
    return { ok: false, error: "La dirección es obligatoria.", field: "direccion" };
  }
  if (direccion.length < 5 || direccion.length > 255) {
    return { ok: false, error: "La dirección debe tener entre 5 y 255 caracteres.", field: "direccion" };
  }

  // SEC: región/comuna deben venir de la lista cerrada de @housing/core —
  // el <select> del cliente ya lo restringe, pero un request manual podría
  // enviar cualquier string, así que se valida también en el servidor.
  if (!region) {
    return { ok: false, error: "La región es obligatoria.", field: "region" };
  }
  if (!esRegionValida(region)) {
    return { ok: false, error: "La región seleccionada no es válida.", field: "region" };
  }
  if (!ciudad) {
    return { ok: false, error: "La ciudad/comuna es obligatoria.", field: "ciudad" };
  }
  if (!esComunaValidaEnRegion(ciudad, region)) {
    return { ok: false, error: "La comuna seleccionada no pertenece a la región indicada.", field: "ciudad" };
  }

  // ── Persistir ────────────────────────────────────────────────────────────

  const requiredComplete = !!(rutCanonical && telefono && fechaNac && direccion && ciudad);

  try {
    await withTenant(session.tenantId, (tx) => tx.usuario.update({
      where: { id: session.sub },
      data:  {
        rut:             rutCanonical,
        telefono,
        fechaNacimiento: fechaNac,
        direccion,
        ciudad,
        region:          region || null,
        fotoPerfil:      fotoPerfil || null,
        perfilCompleto:  requiredComplete,
      },
    }));
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, error: err.message };
    return { ok: false, error: "Error al guardar el perfil. Intenta de nuevo." };
  }

  // ── Refrescar JWT con perfilCompleto actualizado ─────────────────────────
  // AUD-01: se preserva el payload completo (incluido deviceToken) — antes se
  // reconstruía a mano y se perdía deviceToken, expulsando al corredor a
  // /verificar-dispositivo cada vez que guardaba su perfil.
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- se destructuran para excluirlos de `rest`, no para usarlos
    const { iat: _iat, exp: _exp, ...rest } = session;
    const newToken = await signSession({ ...rest, perfilCompleto: requiredComplete });
    await setSessionCookie(newToken);
  } catch {
    // Si falla el JWT, el perfil se guardó igual — el usuario re-loguea y ya
  }

  return { ok: true, perfilCompleto: requiredComplete };
}

// ── Cambiar contraseña ───────────────────────────────────────────────────────

export async function cambiarPasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sesión expirada." };

  const actual    = formData.get("passwordActual")?.toString()   ?? "";
  const nuevo     = formData.get("passwordNuevo")?.toString()    ?? "";
  const confirmar = formData.get("passwordConfirm")?.toString()  ?? "";

  if (!actual || !nuevo || !confirmar) {
    return { ok: false, error: "Completa todos los campos.", field: "passwordActual" };
  }

  if (nuevo !== confirmar) {
    return { ok: false, error: "Las contraseñas nuevas no coinciden.", field: "passwordConfirm" };
  }

  const strength = evaluatePassword(nuevo);
  if (!strength.passes) {
    return {
      ok:    false,
      error: "La nueva contraseña es demasiado débil. Usa al menos 15 caracteres.",
      field: "passwordNuevo",
    };
  }

  // Verificar contraseña actual
  let user: { passwordHash: string | null } | null = null;
  try {
    user = await withTenant(session.tenantId, (tx) => tx.usuario.findUnique({
      where:  { id: session.sub },
      select: { passwordHash: true },
    }));
  } catch {
    return { ok: false, error: "Error al verificar la contraseña." };
  }

  if (!user?.passwordHash) {
    return { ok: false, error: "No tienes contraseña configurada." };
  }

  const valid = await verifyPassword(actual, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "La contraseña actual es incorrecta.", field: "passwordActual" };
  }

  // Actualizar contraseña
  try {
    const newHash = await hashPassword(nuevo);
    await withTenant(session.tenantId, (tx) => tx.usuario.update({
      where: { id: session.sub },
      data:  { passwordHash: newHash },
    }));
  } catch {
    return { ok: false, error: "Error al actualizar la contraseña. Intenta de nuevo." };
  }

  return { ok: true };
}
