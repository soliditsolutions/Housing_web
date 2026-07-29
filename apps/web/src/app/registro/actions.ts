"use server";

import { redirect }                        from "next/navigation";
import { prisma }                          from "@/lib/db";
import { hashPassword }                    from "@/lib/password";
import { signSession, setSessionCookie }   from "@/lib/auth";
import { evaluatePassword }                from "@/lib/password-strength";
import { validateRut, canonicalRut }       from "@/lib/rut";
import { verificarMagicBytes, ALLOWED_MIME_IMAGES } from "@/lib/magic-bytes";

export type RegistroState = { error: string; field?: string } | null;

const RESERVED_TERMS = [
  "admin", "administrador", "moderador", "soporte", "sistema",
  "housing", "solidit", "root", "superuser",
];

// ── Helpers de normalización de nombre ───────────────────────────────────────
// Elimina acentos, pasa a mayúsculas, conserva solo letras y espacios.
// Permite comparar "García López" con "GARCIA LOPEZ" sin distinción de tildes.
function normalizarNombre(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Verifica que los nombres ingresados en el formulario correspondan
 * al nombre extraído del carnet.
 *
 * Acepta diferencias de orden (nombres/apellidos pueden estar invertidos)
 * y omisiones de segundo nombre/apellido materno (frecuente en Chile).
 * Exige mínimo 2 palabras significativas y que al menos el 70 % de
 * las palabras del nombre ingresado aparezcan en el del carnet.
 */
function nombresCoinciden(entrado: string, carnet: string): boolean {
  const ne = normalizarNombre(entrado).split(" ").filter((w) => w.length > 2);
  const nc = normalizarNombre(carnet).split(" ").filter((w) => w.length > 2);

  if (ne.length < 2) return false; // mínimo: nombre + apellido

  const requerido  = Math.max(2, Math.ceil(ne.length * 0.7));
  const coincidencias = ne.filter((w) => nc.includes(w));
  return coincidencias.length >= requerido;
}

// ── Verificación de carnet con IA (Groq vision) ──────────────────────────────
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const PROMPT_CARNET = `Analiza esta imagen de una Cédula de Identidad chilena (RUT).

Extrae EXACTAMENTE:
1. El RUT del campo "R.U.N.", "RUN" o "RUT" → formato sin puntos, con guión: "12345678-9"
2. El nombre completo → concatena APELLIDOS + " " + NOMBRES tal como aparecen, en mayúsculas

Responde SOLAMENTE con JSON válido, sin texto adicional:
{"rut":"12345678-9","nombre":"GARCIA LOPEZ JUAN PABLO"}

Si la imagen NO es una cédula de identidad chilena: {"error":"no_es_carnet"}
Si la imagen es ilegible, borrosa o parcialmente tapada: {"error":"ilegible"}
Si no puedes leer el RUT o el nombre con certeza: {"error":"incompleto"}`;

type CarnetIA =
  | { rut: string; nombre: string }
  | { error: "no_es_carnet" | "ilegible" | "incompleto" | string };

async function leerCarnetConIA(base64: string, mimeType: string): Promise<CarnetIA> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY no configurado");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model:       GROQ_VISION_MODEL,
      temperature: 0,
      max_tokens:  200,
      messages: [
        {
          role:    "user",
          content: [
            {
              type:      "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            { type: "text", text: PROMPT_CARNET },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq vision error ${res.status}`);
  }

  const data    = await res.json();
  const content = (data.choices?.[0]?.message?.content ?? "") as string;

  // Extraer el primer bloque JSON de la respuesta (el modelo puede añadir texto)
  const jsonMatch = content.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error("Respuesta IA sin JSON");

  return JSON.parse(jsonMatch[0]) as CarnetIA;
}

// ── Server Action principal ──────────────────────────────────────────────────
export async function registroAction(
  _prev: RegistroState,
  formData: FormData,
): Promise<RegistroState> {
  const nombre   = formData.get("nombre")?.toString().trim()              ?? "";
  const rut      = formData.get("rut")?.toString().trim()                 ?? "";
  const email    = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const empresa  = formData.get("empresa")?.toString().trim()             ?? "";
  const password = formData.get("password")?.toString()                   ?? "";
  const consent  = formData.get("consent")?.toString();

  // ── 1. Validaciones de formato ────────────────────────────────────────────
  if (!nombre || !rut || !email || !empresa || !password) {
    return { error: "Completa todos los campos obligatorios." };
  }

  if (nombre.length < 2 || nombre.length > 80) {
    return { error: "El nombre debe tener entre 2 y 80 caracteres.", field: "nombre" };
  }

  if (!validateRut(rut)) {
    return { error: "El RUT no es válido. Verifica el dígito verificador.", field: "rut" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "El correo electrónico no es válido.", field: "email" };
  }

  if (empresa.length < 2 || empresa.length > 120) {
    return { error: "El nombre de la empresa debe tener entre 2 y 120 caracteres.", field: "empresa" };
  }

  // Ley 21.719 Art. 4 — consentimiento explícito e inequívoco (no premarcado)
  if (!consent) {
    return { error: "Debes aceptar los Términos de uso y la Política de privacidad." };
  }

  const nombreLower = nombre.toLowerCase();
  if (RESERVED_TERMS.some((t) => nombreLower.includes(t))) {
    return {
      error: "El nombre no puede contener términos reservados del sistema.",
      field: "nombre",
    };
  }

  // NIST SP800-63B sin 2FA → mínimo score 3
  const strength = evaluatePassword(password);
  if (!strength.passes) {
    return {
      error: "La contraseña es demasiado débil. Usa al menos 15 caracteres.",
      field: "password",
    };
  }

  // ── 2. Verificación de identidad por carnet ──────────────────────────────
  // AUD-07: modo de prueba E2E — omite la verificación con IA (que exige una
  // cédula real) para permitir pruebas automatizadas del registro. SOLO
  // funciona fuera de producción; runStartupChecks() aborta el arranque si
  // esta variable llega a estar definida en un entorno de producción.
  const bypassIdentidad =
    process.env.NODE_ENV !== "production" && process.env.E2E_BYPASS_IDENTITY === "1";

  let rutCanonical: string;

  if (bypassIdentidad) {
    rutCanonical = canonicalRut(rut);
  } else {
    const carnetFile = formData.get("carnet");

    if (!carnetFile || !(carnetFile instanceof File) || carnetFile.size === 0) {
      return {
        error: "Debes verificar tu identidad subiendo una foto de tu Cédula de Identidad.",
        field: "carnet",
      };
    }

    if (!ALLOWED_MIME_IMAGES.has(carnetFile.type)) {
      return { error: "El carnet debe ser una imagen JPG, PNG o WEBP.", field: "carnet" };
    }

    if (carnetFile.size > 5 * 1024 * 1024) {
      return { error: "La imagen del carnet no puede superar los 5 MB.", field: "carnet" };
    }

    // FIX M4: verificar magic bytes — el cliente puede declarar un MIME falso (CWE-434)
    const buffer = Buffer.from(await carnetFile.arrayBuffer());
    if (!verificarMagicBytes(buffer, carnetFile.type)) {
      return { error: "El archivo no corresponde al tipo de imagen declarado.", field: "carnet" };
    }

    const base64 = buffer.toString("base64");

    // BL-INIT1 runtime: verificación explícita antes de la llamada a la API externa
    // para entregar un mensaje descriptivo al usuario en vez de un error genérico.
    if (!process.env.GROQ_API_KEY) {
      return {
        error: "El servicio de verificación de identidad no está disponible temporalmente. Contacta con soporte.",
        field: "carnet",
      };
    }

    let carnetDatos: CarnetIA;
    try {
      carnetDatos = await leerCarnetConIA(base64, carnetFile.type);
    } catch {
      return {
        error: "No pudimos procesar la imagen en este momento. Intenta de nuevo en unos segundos.",
        field: "carnet",
      };
    }

    if ("error" in carnetDatos) {
      const mensajes: Record<string, string> = {
        no_es_carnet: "La imagen no corresponde a una Cédula de Identidad chilena.",
        ilegible:     "La imagen del carnet es ilegible. Sube una foto más clara y bien iluminada.",
        incompleto:   "No pudimos leer todos los datos del carnet. Asegúrate de que el frontis sea totalmente visible.",
      };
      return {
        error: mensajes[carnetDatos.error] ?? "No pudimos verificar el carnet. Intenta con una imagen diferente.",
        field: "carnet",
      };
    }

    // Comparar RUT
    rutCanonical = canonicalRut(rut);
    const rutDelCarnet = canonicalRut(carnetDatos.rut ?? "");

    if (!rutDelCarnet || rutDelCarnet !== rutCanonical) {
      return {
        error: "El documento de identidad no corresponde con el RUT ingresado. Verifica que el carnet y los datos del formulario sean correctos.",
        field: "rut",
      };
    }

    // Comparar nombre
    if (!nombresCoinciden(nombre, carnetDatos.nombre ?? "")) {
      return {
        error: "El nombre del carnet no coincide con el nombre ingresado. Usa el nombre exacto que aparece en tu documento.",
        field: "nombre",
      };
    }
  }

  // ── 3. Unicidad en base de datos ─────────────────────────────────────────
  // Solo verificamos unicidad después de que la identidad está confirmada.
  // Esto evita que se enumeren emails/RUTs sin pasar la verificación.
  // ADR-0011 Fase 2: email/RUT únicos son GLOBALES (no por tenant) — antes de
  // que exista sesión no hay tenant al cual scopear la consulta, así que se
  // resuelve con las mismas funciones SECURITY DEFINER que usa login.
  try {
    const [emailRows, rutRows] = await Promise.all([
      prisma.$queryRaw<{ existe: boolean }[]>`SELECT auth_email_existe(${email}) AS existe`,
      prisma.$queryRaw<{ existe: boolean }[]>`SELECT auth_rut_existe(${rutCanonical}) AS existe`,
    ]);

    if (emailRows[0]?.existe) {
      return { error: "Ya existe una cuenta con este correo electrónico.", field: "email" };
    }
    if (rutRows[0]?.existe) {
      return { error: "Ya existe una cuenta registrada con este RUT.", field: "rut" };
    }
  } catch {
    return { error: "Error al conectar con el servidor. Intenta de nuevo." };
  }

  // ── 4. Crear Tenant + Usuario en transacción atómica ─────────────────────
  let newUser: {
    id: string; tenantId: string; rol: "manager" | "colaborador"; nombre: string; email: string;
  } | null = null;

  try {
    const passwordHash = await hashPassword(password);
    const now          = new Date();

    newUser = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data:   { nombre: empresa, plan: "Gratuito" },
        select: { id: true },
      });

      // ADR-0011 Fase 2: el tenant recién se creó en esta misma transacción —
      // antes no existía ningún tenant al cual asociar la sesión RLS. A partir
      // de aquí, dentro de esta transacción, ya se puede escribir en usuario.
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`;

      return tx.usuario.create({
        data: {
          tenantId:       tenant.id,
          rol:            "manager",
          nombre,
          rut:            rutCanonical,
          email,
          passwordHash,
          consentGivenAt: now,
          consentVersion: "tys-v1.0",
        },
        select: { id: true, tenantId: true, rol: true, nombre: true, email: true },
      });
    });
  } catch {
    return { error: "Error al crear la cuenta. Intenta de nuevo." };
  }

  // ── 5. Emitir sesión JWT ─────────────────────────────────────────────────
  // Sin deviceToken — el proxy redirigirá a /verificar-dispositivo.
  try {
    const token = await signSession({
      sub:            newUser.id,
      tenantId:       newUser.tenantId,
      rol:            newUser.rol,
      nombre:         newUser.nombre,
      email:          newUser.email,
      perfilCompleto: false,
    });
    await setSessionCookie(token);
  } catch {
    return { error: "Cuenta creada, pero no pudimos iniciar sesión. Intenta ingresar." };
  }

  redirect("/verificar-dispositivo");
}
