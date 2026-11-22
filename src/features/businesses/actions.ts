"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createBusinessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(100, "El nombre no puede superar 100 caracteres."),
  phone: z
    .string()
    .trim()
    .max(30, "El teléfono no puede superar 30 caracteres.")
    .optional()
    .transform((value) => value || null),
  whatsapp: z
    .string()
    .trim()
    .max(30, "El WhatsApp no puede superar 30 caracteres.")
    .optional()
    .transform((value) => value || null),
});

const updateBusinessSchema = createBusinessSchema.extend({
  businessId: z.uuid(),
});

export type CreateBusinessState = {
  error: string | null;
};

export async function createBusinessAction(
  _previousState: CreateBusinessState,
  formData: FormData,
): Promise<CreateBusinessState> {
  const parsed = createBusinessSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados.",
    };
  }

  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      return { error: "Tu sesión terminó. Inicia sesión de nuevo." };
    }

    const { db } = await import("@/db");
    const { businesses, staff } = await import("@/db/schema");
    const id = randomUUID();
    const slugBase = parsed.data.name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const slug = `${slugBase || "negocio"}-${id.slice(0, 8)}`;

    await db.batch([
      db
        .insert(businesses)
        .values({
          id,
          ownerId: session.user.id,
          name: parsed.data.name,
          slug,
          phone: parsed.data.phone,
          whatsapp: parsed.data.whatsapp,
        })
        .returning({ id: businesses.id }),
      db.insert(staff).values({
        businessId: id,
        userId: session.user.id,
        displayName: session.user.name,
      }),
    ]);
  } catch (error) {
    console.error("No se pudo crear el negocio.", error);
    return {
      error:
        "No pudimos guardar tu negocio. Inténtalo de nuevo en unos minutos.",
    };
  }

  redirect("/inicio");
}

export type UpdateBusinessState = {
  error: string | null;
  success: string | null;
};

export async function updateBusinessAction(
  _previousState: UpdateBusinessState,
  formData: FormData,
): Promise<UpdateBusinessState> {
  const parsed = updateBusinessSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisa los datos del negocio.",
      success: null,
    };
  }

  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return {
        error: "Tu sesión terminó. Inicia sesión de nuevo.",
        success: null,
      };
    }

    const { db } = await import("@/db");
    const { businesses } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const updated = await db
      .update(businesses)
      .set({
        name: parsed.data.name,
        phone: parsed.data.phone,
        whatsapp: parsed.data.whatsapp,
      })
      .where(
        and(
          eq(businesses.id, parsed.data.businessId),
          eq(businesses.ownerId, session.user.id),
        ),
      )
      .returning({ id: businesses.id });

    if (updated.length === 0) {
      return {
        error: "No encontramos el negocio o no tienes permiso para editarlo.",
        success: null,
      };
    }

    revalidatePath("/inicio");
    return { error: null, success: "Datos del negocio actualizados." };
  } catch (error) {
    console.error("No se pudieron actualizar los datos del negocio.", error);
    return {
      error: "No pudimos guardar los cambios. Inténtalo de nuevo.",
      success: null,
    };
  }
}
