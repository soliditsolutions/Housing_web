import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Cliente Prisma único (evita múltiples instancias en dev con HMR).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// v5: clave actualizada para forzar re-creación tras prisma generate (aceptaMascotas en Propiedad)
const globalForPrisma = globalThis as unknown as { prisma_v5?: PrismaClient };

export const prisma =
  globalForPrisma.prisma_v5 ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma_v5 = prisma;
