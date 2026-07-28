"use server";

import { revalidatePath } from "next/cache";
import { getTenant } from "@/lib/queries";
import { withTenant } from "@/lib/tenant-db";
import { validarRut, esRegionValida, esComunaValidaEnRegion, esOrientacionValida } from "@housing/core";
import { canonicalRut } from "@/lib/rut";
import { logError } from "@/lib/logger";
import { geocodificarDireccion } from "@/lib/geocoding";
import { checkRateLimit } from "@/lib/rate-limit";

export type ResultadoCrear =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type ResultadoOk =
  | { ok: true }
  | { ok: false; error: string };

/** Error de dominio controlado — el mensaje llega al cliente tal cual. */
class DomainError extends Error {
  constructor(msg: string) { super(msg); this.name = "DomainError"; }
}

/**
 * SEC: solo se aceptan rutas generadas por /api/upload (uuid.ext dentro de
 * /uploads/propiedades/). Bloquea URLs externas, data:, javascript:, etc.
 */
const IMAGEN_URL_RE = /^\/uploads\/propiedades\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/;

function filtrarImagenesValidas(imagenes: string[] | undefined): string[] {
  return (imagenes ?? [])
    .map((u) => u.trim())
    .filter((u) => IMAGEN_URL_RE.test(u))
    .slice(0, 5); // máximo 5 imágenes
}

/**
 * Busca una persona por RUT en el tenant activo.
 * Si no existe, la crea con los datos proporcionados.
 * Devuelve el id (existente o nuevo).
 */
export async function buscarOCrearPersona(data: {
  nombre: string;
  rut: string;
  email?: string;
  telefono?: string;
}): Promise<ResultadoCrear> {
  const nombre = data.nombre.trim();
  const rut    = data.rut.trim();
  if (!nombre) return { ok: false, error: "El nombre es obligatorio." };
  if (!rut)    return { ok: false, error: "El RUT es obligatorio." };
  if (!validarRut(rut))
    return { ok: false, error: "El RUT ingresado no es válido (verifique el dígito verificador)." };
  // Guardar en forma canónica (sin puntos) — es el mismo formato que usa el
  // portal de autoconsulta para buscar por RUT; si no coincide, el arrendatario
  // nunca encuentra su contrato al pedir el código de acceso.
  const rutCanon = canonicalRut(rut);
  try {
    const tenant = await getTenant();
    // BL-RC3: upsert elimina la race condition check-then-create.
    // @@unique([tenantId, rut]) garantiza que dos requests concurrentes con el mismo
    // RUT no creen personas duplicadas; update:{} preserva los datos existentes.
    const persona = await withTenant(tenant.id, (tx) => tx.persona.upsert({
      where: { tenantId_rut: { tenantId: tenant.id, rut: rutCanon } },
      create: {
        tenantId: tenant.id,
        nombre,
        rut: rutCanon,
        email:    data.email?.trim()    || null,
        telefono: data.telefono?.trim() || null,
      },
      update: {},
    }));
    return { ok: true, id: persona.id };
  } catch (e) {
    logError("buscarOCrearPersona", e);
    return { ok: false, error: "Error al buscar o crear la persona. Intenta nuevamente." };
  }
}

/**
 * Crea una propiedad nueva con estado "borrador".
 * El corredor debe activarla manualmente para que quede disponible.
 * Busca o crea el propietario por RUT dentro del tenant.
 */
export async function crearPropiedad(data: {
  tipo: string;
  direccion: string;
  comuna?: string;
  region?: string;
  piezas?: number;
  banos?: number;
  m2Totales?: number;
  m2Construidos?: number;
  estacionamientos?: number;
  plantas?: number;
  antiguedadAnios?: number;
  orientacion?: string;
  esCondominio: boolean;
  pagaGastosComunes: boolean;
  valorGastosComunes?: number;
  aceptaMascotas: boolean;
  otrasDescripciones?: string;
  /** Si es true, el marketplace público muestra el pin exacto y la dirección completa. */
  mostrarUbicacionExacta: boolean;
  propietarioNombre: string;
  propietarioRut: string;
  propietarioEmail?: string;
  /** URLs de imágenes (hasta 5). */
  imagenes?: string[];
}): Promise<ResultadoCrear> {
  if (!["casa", "departamento", "cabana"].includes(data.tipo))
    return { ok: false, error: "Tipo de propiedad inválido." };
  if (!data.direccion.trim())
    return { ok: false, error: "La dirección es obligatoria." };
  if (!data.propietarioNombre.trim())
    return { ok: false, error: "El nombre del propietario es obligatorio." };
  if (!data.propietarioRut.trim())
    return { ok: false, error: "El RUT del propietario es obligatorio." };
  // RUT-1: validar formato y dígito verificador
  if (!validarRut(data.propietarioRut.trim()))
    return { ok: false, error: "El RUT del propietario no es válido (verifique el dígito verificador)." };
  // Forma canónica (sin puntos) — debe coincidir con la búsqueda del portal OTP.
  const propietarioRutCanon = canonicalRut(data.propietarioRut.trim());
  // V6: validar campos numéricos opcionales
  if (data.piezas !== undefined && (!Number.isInteger(data.piezas) || data.piezas < 0))
    return { ok: false, error: "El número de piezas debe ser un entero no negativo." };
  if (data.banos !== undefined && (!Number.isInteger(data.banos) || data.banos < 0))
    return { ok: false, error: "El número de baños debe ser un entero no negativo." };
  if (data.m2Totales !== undefined && (!Number.isFinite(data.m2Totales) || data.m2Totales < 0))
    return { ok: false, error: "Los metros cuadrados deben ser un número no negativo." };
  if (data.m2Construidos !== undefined && (!Number.isFinite(data.m2Construidos) || data.m2Construidos < 0))
    return { ok: false, error: "Los metros cuadrados construidos deben ser un número no negativo." };
  if (data.estacionamientos !== undefined && (!Number.isInteger(data.estacionamientos) || data.estacionamientos < 0))
    return { ok: false, error: "El número de estacionamientos debe ser un entero no negativo." };
  if (data.plantas !== undefined && (!Number.isInteger(data.plantas) || data.plantas < 0))
    return { ok: false, error: "El número de plantas debe ser un entero no negativo." };
  if (data.antiguedadAnios !== undefined && (!Number.isInteger(data.antiguedadAnios) || data.antiguedadAnios < 0))
    return { ok: false, error: "La antigüedad debe ser un entero no negativo." };
  // SEC: región/comuna/orientación vienen de un <select> con lista cerrada en
  // el cliente, pero un request manual podría enviar cualquier string.
  if (data.region && !esRegionValida(data.region))
    return { ok: false, error: "La región seleccionada no es válida." };
  if (data.comuna) {
    if (!data.region)
      return { ok: false, error: "Selecciona una región antes de elegir la comuna." };
    if (!esComunaValidaEnRegion(data.comuna, data.region))
      return { ok: false, error: "La comuna seleccionada no pertenece a la región indicada." };
  }
  if (data.orientacion && !esOrientacionValida(data.orientacion))
    return { ok: false, error: "La orientación seleccionada no es válida." };
  // V7: valorGastosComunes cuando pagaGastosComunes = true
  if (
    data.pagaGastosComunes &&
    data.valorGastosComunes !== undefined &&
    (!Number.isFinite(data.valorGastosComunes) || data.valorGastosComunes <= 0)
  )
    return { ok: false, error: "El valor de gastos comunes debe ser mayor que cero." };

  const imagenesValidas = filtrarImagenesValidas(data.imagenes);

  // Geocodificación best-effort — nunca bloquea la creación de la propiedad.
  // Se hace fuera de la transacción de BD para no mantenerla abierta esperando la red.
  const coords = await geocodificarDireccion(
    data.direccion.trim(),
    data.comuna?.trim() || null,
    data.region?.trim() || null,
  );

  try {
    const tenant = await getTenant();

    const propiedad = await withTenant(tenant.id, async (tx) => {
      // Buscar o crear propietario por RUT (dentro del tenant)
      let propietario = await tx.persona.findFirst({
        where: { tenantId: tenant.id, rut: propietarioRutCanon },
      });
      if (!propietario) {
        propietario = await tx.persona.create({
          data: {
            tenantId: tenant.id,
            nombre: data.propietarioNombre.trim(),
            rut:    propietarioRutCanon,
            email:  data.propietarioEmail?.trim() || null,
          },
        });
      }

      const p = await tx.propiedad.create({
        data: {
          tenantId:    tenant.id,
          propietarioId: propietario.id,
          tipo:        data.tipo as "casa" | "departamento" | "cabana",
          estado:      "borrador",          // ← siempre borrador al crear
          direccion:   data.direccion.trim(),
          comuna:      data.comuna?.trim()  || null,
          region:      data.region?.trim()  || null,
          piezas:      data.piezas    ?? null,
          banos:       data.banos     ?? null,
          m2Totales:   data.m2Totales ?? null,
          m2Construidos:    data.m2Construidos    ?? null,
          estacionamientos: data.estacionamientos ?? null,
          plantas:          data.plantas          ?? null,
          antiguedadAnios:  data.antiguedadAnios   ?? null,
          orientacion:      data.orientacion?.trim() || null,
          esCondominio:     data.esCondominio,
          pagaGastosComunes: data.pagaGastosComunes,
          valorGastosComunes:
            data.pagaGastosComunes && data.valorGastosComunes
              ? data.valorGastosComunes
              : null,
          aceptaMascotas: data.aceptaMascotas,
          otrasDescripciones: data.otrasDescripciones?.trim() || null,
          mostrarUbicacionExacta: data.mostrarUbicacionExacta,
          latitud:  coords?.latitud  ?? null,
          longitud: coords?.longitud ?? null,
        },
      });

      // Guardar imágenes si hay
      if (imagenesValidas.length > 0) {
        await tx.imagenPropiedad.createMany({
          data: imagenesValidas.map((url, idx) => ({
            tenantId:    tenant.id,
            propiedadId: p.id,
            url,
            orden:       idx,
          })),
        });
      }

      return p;
    });

    revalidatePath("/panel/propiedades");
    revalidatePath("/panel");
    return { ok: true, id: propiedad.id };
  } catch (e) {
    logError("crearPropiedad", e);
    return { ok: false, error: "Error al crear la propiedad. Por favor intenta nuevamente." };
  }
}

/**
 * Actualiza los campos editables de una propiedad.
 * Solo permitido cuando estado ∈ {borrador, disponible}.
 * Las imágenes se reemplazan en bloque (delete-all + insert-new).
 */
export async function actualizarPropiedad(
  propiedadId: string,
  data: {
    tipo: string;
    direccion: string;
    comuna?: string;
    region?: string;
    piezas?: number;
    banos?: number;
    m2Totales?: number;
    m2Construidos?: number;
    estacionamientos?: number;
    plantas?: number;
    antiguedadAnios?: number;
    orientacion?: string;
    esCondominio: boolean;
    pagaGastosComunes: boolean;
    valorGastosComunes?: number;
    aceptaMascotas: boolean;
    otrasDescripciones?: string;
    mostrarUbicacionExacta: boolean;
    imagenes?: string[];
  },
): Promise<ResultadoOk> {
  if (!propiedadId)
    return { ok: false, error: "ID de propiedad requerido." };
  if (!["casa", "departamento", "cabana"].includes(data.tipo))
    return { ok: false, error: "Tipo de propiedad inválido." };
  if (!data.direccion.trim())
    return { ok: false, error: "La dirección es obligatoria." };
  if (data.piezas !== undefined && (!Number.isInteger(data.piezas) || data.piezas < 0))
    return { ok: false, error: "El número de piezas debe ser un entero no negativo." };
  if (data.banos !== undefined && (!Number.isInteger(data.banos) || data.banos < 0))
    return { ok: false, error: "El número de baños debe ser un entero no negativo." };
  if (data.m2Totales !== undefined && (!Number.isFinite(data.m2Totales) || data.m2Totales < 0))
    return { ok: false, error: "Los metros cuadrados deben ser un número no negativo." };
  if (data.m2Construidos !== undefined && (!Number.isFinite(data.m2Construidos) || data.m2Construidos < 0))
    return { ok: false, error: "Los metros cuadrados construidos deben ser un número no negativo." };
  if (data.estacionamientos !== undefined && (!Number.isInteger(data.estacionamientos) || data.estacionamientos < 0))
    return { ok: false, error: "El número de estacionamientos debe ser un entero no negativo." };
  if (data.plantas !== undefined && (!Number.isInteger(data.plantas) || data.plantas < 0))
    return { ok: false, error: "El número de plantas debe ser un entero no negativo." };
  if (data.antiguedadAnios !== undefined && (!Number.isInteger(data.antiguedadAnios) || data.antiguedadAnios < 0))
    return { ok: false, error: "La antigüedad debe ser un entero no negativo." };
  // SEC: región/comuna/orientación vienen de un <select> con lista cerrada en
  // el cliente, pero un request manual podría enviar cualquier string.
  if (data.region && !esRegionValida(data.region))
    return { ok: false, error: "La región seleccionada no es válida." };
  if (data.comuna) {
    if (!data.region)
      return { ok: false, error: "Selecciona una región antes de elegir la comuna." };
    if (!esComunaValidaEnRegion(data.comuna, data.region))
      return { ok: false, error: "La comuna seleccionada no pertenece a la región indicada." };
  }
  if (data.orientacion && !esOrientacionValida(data.orientacion))
    return { ok: false, error: "La orientación seleccionada no es válida." };
  if (
    data.pagaGastosComunes &&
    data.valorGastosComunes !== undefined &&
    (!Number.isFinite(data.valorGastosComunes) || data.valorGastosComunes <= 0)
  )
    return { ok: false, error: "El valor de gastos comunes debe ser mayor que cero." };

  const imagenesValidas = filtrarImagenesValidas(data.imagenes);

  // Geocodificación best-effort — si falla, se conservan las coordenadas previas
  // (no se sobrescriben con null solo porque el servicio externo falló).
  const coords = await geocodificarDireccion(
    data.direccion.trim(),
    data.comuna?.trim() || null,
    data.region?.trim() || null,
  );

  try {
    const tenant = await getTenant();

    await withTenant(tenant.id, async (tx) => {
      /* Verificar que existe, pertenece al tenant y es editable */
      const prop = await tx.propiedad.findFirst({
        where: {
          id: propiedadId,
          tenantId: tenant.id,
          estado: { in: ["borrador", "disponible"] },
        },
      });
      if (!prop)
        throw new DomainError(
          "La propiedad no es editable (está reservada o arrendada), no existe, o no pertenece a este corredor.",
        );

      /* Actualizar campos */
      await tx.propiedad.update({
        where: { id: propiedadId, tenantId: tenant.id },
        data: {
          tipo:        data.tipo as "casa" | "departamento" | "cabana",
          direccion:   data.direccion.trim(),
          comuna:      data.comuna?.trim()  || null,
          region:      data.region?.trim()  || null,
          piezas:      data.piezas    ?? null,
          banos:       data.banos     ?? null,
          m2Totales:   data.m2Totales ?? null,
          m2Construidos:    data.m2Construidos    ?? null,
          estacionamientos: data.estacionamientos ?? null,
          plantas:          data.plantas          ?? null,
          antiguedadAnios:  data.antiguedadAnios   ?? null,
          orientacion:      data.orientacion?.trim() || null,
          esCondominio:     data.esCondominio,
          pagaGastosComunes: data.pagaGastosComunes,
          valorGastosComunes:
            data.pagaGastosComunes && data.valorGastosComunes
              ? data.valorGastosComunes
              : null,
          aceptaMascotas: data.aceptaMascotas,
          otrasDescripciones: data.otrasDescripciones?.trim() || null,
          mostrarUbicacionExacta: data.mostrarUbicacionExacta,
          ...(coords ? { latitud: coords.latitud, longitud: coords.longitud } : {}),
        },
      });

      /* Reemplazar imágenes (delete-all + insert-new) */
      await tx.imagenPropiedad.deleteMany({
        where: { propiedadId, tenantId: tenant.id },
      });
      if (imagenesValidas.length > 0) {
        await tx.imagenPropiedad.createMany({
          data: imagenesValidas.map((url, idx) => ({
            tenantId:    tenant.id,
            propiedadId,
            url,
            orden:       idx,
          })),
        });
      }
    });

    revalidatePath("/panel/propiedades");
    revalidatePath("/panel");
    return { ok: true };
  } catch (e) {
    logError("actualizarPropiedad", e);
    if (e instanceof DomainError) return { ok: false, error: e.message };
    return { ok: false, error: "Error al actualizar la propiedad. Por favor intenta nuevamente." };
  }
}

/**
 * Desactiva una propiedad disponible → borrador.
 * Baja la publicación del marketplace (estado → "bajada") en la misma TX.
 */
export async function desactivarPropiedad(propiedadId: string): Promise<ResultadoOk> {
  if (!propiedadId)
    return { ok: false, error: "ID de propiedad requerido." };
  try {
    const tenant = await getTenant();
    await withTenant(tenant.id, async (tx) => {
      const prop = await tx.propiedad.findFirst({
        where: { id: propiedadId, tenantId: tenant.id, estado: "disponible" },
      });
      if (!prop)
        throw new DomainError("La propiedad no existe, no pertenece a este corredor, o no está disponible.");
      await tx.propiedad.update({
        where: { id: propiedadId, tenantId: tenant.id },
        data:  { estado: "borrador" },
      });
      // Bajar del marketplace si había publicación activa
      await tx.publicacion.updateMany({
        where: { propiedadId, tenantId: tenant.id, estado: "publicada" },
        data:  { estado: "bajada" },
      });
    });
    revalidatePath("/panel/propiedades");
    revalidatePath("/marketplace");
    revalidatePath("/panel");
    return { ok: true };
  } catch (e) {
    logError("desactivarPropiedad", e);
    if (e instanceof DomainError) return { ok: false, error: e.message };
    return { ok: false, error: "Error al desactivar la propiedad. Intenta nuevamente." };
  }
}

/**
 * Activa una propiedad borrador → disponible.
 * Crea o reactiva la publicación en el marketplace en la misma TX.
 */
export async function activarPropiedad(propiedadId: string): Promise<ResultadoOk> {
  if (!propiedadId)
    return { ok: false, error: "ID de propiedad requerido." };
  try {
    const tenant = await getTenant();
    await withTenant(tenant.id, async (tx) => {
      const prop = await tx.propiedad.findFirst({
        where: { id: propiedadId, tenantId: tenant.id, estado: "borrador" },
      });
      if (!prop)
        throw new DomainError("La propiedad no existe, no pertenece a este corredor, o ya está activa.");
      await tx.propiedad.update({
        where: { id: propiedadId, tenantId: tenant.id },
        data:  { estado: "disponible" },
      });
      // Publicar en marketplace: reactiva si ya existe, crea si no
      const pubExistente = await tx.publicacion.findFirst({
        where: { propiedadId, tenantId: tenant.id },
      });
      if (pubExistente) {
        await tx.publicacion.update({
          where: { id: pubExistente.id },
          data:  { estado: "publicada", publicadaEn: new Date() },
        });
      } else {
        await tx.publicacion.create({
          data: {
            tenantId:    tenant.id,
            propiedadId,
            titulo:      prop.direccion,
            estado:      "publicada",
            publicadaEn: new Date(),
          },
        });
      }
    });
    revalidatePath("/panel/propiedades");
    revalidatePath("/marketplace");
    revalidatePath("/panel");
    return { ok: true };
  } catch (e) {
    logError("activarPropiedad", e);
    if (e instanceof DomainError) return { ok: false, error: e.message };
    return { ok: false, error: "Error al activar la propiedad. Intenta nuevamente." };
  }
}

export type ResultadoPreviewUbicacion =
  | { ok: true; latitud: number; longitud: number }
  | { ok: false; error: string };

/**
 * Geocodifica una dirección SIN guardar nada — solo para que el corredor vea
 * un mapa de confirmación antes de guardar la propiedad y detecte errores de
 * tipeo en la dirección (ej. calle inexistente, comuna equivocada).
 *
 * SEC: rate-limit por tenant (no por IP, porque es una acción autenticada de
 * panel) para no exceder la política de uso de Nominatim (máx. 1 req/seg) ni
 * arriesgar que bloqueen la IP del servidor por abuso — respetamos su límite
 * aunque el corredor dispare varios blur seguidos.
 */
export async function previsualizarUbicacion(
  direccion: string,
  comuna: string,
  region: string,
): Promise<ResultadoPreviewUbicacion> {
  if (!direccion.trim())
    return { ok: false, error: "Ingresa una dirección primero." };

  try {
    const tenant = await getTenant();
    const rl = checkRateLimit(`preview-ubicacion:${tenant.id}`, 1, 1500);
    if (!rl.allowed)
      return { ok: false, error: "Espera un momento antes de volver a previsualizar." };

    const coords = await geocodificarDireccion(direccion.trim(), comuna.trim() || null, region.trim() || null);
    if (!coords)
      return { ok: false, error: "No se pudo ubicar esa dirección. Verifica que esté bien escrita." };

    return { ok: true, latitud: coords.latitud, longitud: coords.longitud };
  } catch (e) {
    logError("previsualizarUbicacion", e);
    return { ok: false, error: "Error al previsualizar la ubicación." };
  }
}
