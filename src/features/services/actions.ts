"use server";

import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  serviceFormSchema,
  serviceStatusSchema,
} from "@/features/services/schemas";

export type ServiceActionState = {
  error: string | null;
  success: string | null;
};

async function getOwnedBusiness(businessId: string) {
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return null;

  const { db } = await import("@/db");
  const { businesses } = await import("@/db/schema");
  const [business] = await db
    .select({ id: businesses.id, ownerId: businesses.ownerId })
    .from(businesses)
    .where(
      and(
        eq(businesses.id, businessId),
        eq(businesses.ownerId, session.user.id),
      ),
    )
    .limit(1);

  return business ? { db, business, session } : null;
}

export async function saveServiceAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const parsed = serviceFormSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Revisa los datos del servicio.",
      success: null,
    };
  }

  try {
    const owned = await getOwnedBusiness(parsed.data.businessId);
    if (!owned) {
      return {
        error: "No encontramos el negocio o no tienes permiso para editarlo.",
        success: null,
      };
    }

    const { services } = await import("@/db/schema");

    if (parsed.data.serviceId) {
      const updated = await owned.db
        .update(services)
        .set({
          name: parsed.data.name,
          durationMinutes: parsed.data.durationMinutes,
          priceCrc: parsed.data.priceCrc,
        })
        .where(
          and(
            eq(services.id, parsed.data.serviceId),
            eq(services.businessId, owned.business.id),
          ),
        )
        .returning({ id: services.id });

      if (updated.length === 0) {
        return {
          error: "No encontramos ese servicio en tu negocio.",
          success: null,
        };
      }
    } else {
      const { staff, staffServices } = await import("@/db/schema");
      let [ownerStaff] = await owned.db
        .select({ id: staff.id })
        .from(staff)
        .where(
          and(
            eq(staff.businessId, owned.business.id),
            eq(staff.userId, owned.business.ownerId),
          ),
        )
        .limit(1);

      if (!ownerStaff) {
        await owned.db
          .insert(staff)
          .values({
            id: randomUUID(),
            businessId: owned.business.id,
            userId: owned.business.ownerId,
            displayName: owned.session.user.name,
          })
          .onConflictDoNothing({ target: [staff.businessId, staff.userId] });

        [ownerStaff] = await owned.db
          .select({ id: staff.id })
          .from(staff)
          .where(
            and(
              eq(staff.businessId, owned.business.id),
              eq(staff.userId, owned.business.ownerId),
            ),
          )
          .limit(1);
      }

      if (!ownerStaff) {
        return {
          error: "No pudimos preparar tu perfil de profesional.",
          success: null,
        };
      }

      const serviceId = randomUUID();
      await owned.db.batch([
        owned.db.insert(services).values({
          id: serviceId,
          businessId: owned.business.id,
          name: parsed.data.name,
          durationMinutes: parsed.data.durationMinutes,
          priceCrc: parsed.data.priceCrc,
        }),
        owned.db.insert(staffServices).values({
          staffId: ownerStaff.id,
          serviceId,
          businessId: owned.business.id,
        }),
      ]);
    }

    revalidatePath("/inicio");
    return { error: null, success: "Servicio guardado correctamente." };
  } catch (error) {
    console.error("No se pudo guardar el servicio.", error);
    return {
      error: "No pudimos guardar el servicio. Inténtalo de nuevo.",
      success: null,
    };
  }
}

export async function setServiceActiveAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const parsed = serviceStatusSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!parsed.success) {
    return {
      error: "No pudimos actualizar el estado del servicio.",
      success: null,
    };
  }

  try {
    const owned = await getOwnedBusiness(parsed.data.businessId);
    if (!owned) {
      return {
        error: "No encontramos el negocio o no tienes permiso para editarlo.",
        success: null,
      };
    }

    const { services } = await import("@/db/schema");
    const updated = await owned.db
      .update(services)
      .set({ active: parsed.data.active })
      .where(
        and(
          eq(services.id, parsed.data.serviceId),
          eq(services.businessId, owned.business.id),
        ),
      )
      .returning({ id: services.id });

    if (updated.length === 0) {
      return {
        error: "No encontramos ese servicio en tu negocio.",
        success: null,
      };
    }

    revalidatePath("/inicio");
    return {
      error: null,
      success: parsed.data.active
        ? "Servicio activado."
        : "Servicio desactivado.",
    };
  } catch (error) {
    console.error("No se pudo actualizar el estado del servicio.", error);
    return {
      error: "No pudimos actualizar el servicio. Inténtalo de nuevo.",
      success: null,
    };
  }
}
