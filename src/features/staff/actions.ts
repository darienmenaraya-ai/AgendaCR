"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  acceptStaffInvitationSchema,
  createStaffInvitationSchema,
  revokeStaffInvitationSchema,
  updateStaffServiceSchema,
} from "@/features/staff/schemas";
import { sendStaffInvitationNotification } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

export type InvitationActionState = {
  error: string | null;
  inviteUrl: string | null;
  emailStatus?: "sent" | "failed" | "not-configured";
};

export type StaffActionState = {
  error: string | null;
  success: string | null;
};

export async function updateStaffServiceAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const parsed = updateStaffServiceSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: "No pudimos actualizar el servicio.", success: null };
  }

  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { error: "Inicia sesión de nuevo.", success: null };
    }

    const { db } = await import("@/db");
    const { businesses, services, staff, staffServices } =
      await import("@/db/schema");
    const [validAssignment] = await db
      .select({
        staffId: staff.id,
        staffActive: staff.active,
        serviceId: services.id,
        serviceActive: services.active,
      })
      .from(businesses)
      .innerJoin(staff, eq(staff.businessId, businesses.id))
      .innerJoin(services, eq(services.businessId, businesses.id))
      .where(
        and(
          eq(businesses.id, parsed.data.businessId),
          eq(businesses.ownerId, session.user.id),
          eq(staff.id, parsed.data.staffId),
          eq(services.id, parsed.data.serviceId),
        ),
      )
      .limit(1);
    if (!validAssignment) {
      return {
        error: "El profesional o servicio no pertenece al negocio.",
        success: null,
      };
    }

    if (parsed.data.assigned === "true") {
      if (!validAssignment.staffActive || !validAssignment.serviceActive) {
        return {
          error:
            "Solo puedes asignar servicios activos a profesionales activos.",
          success: null,
        };
      }
      await db
        .insert(staffServices)
        .values({
          businessId: parsed.data.businessId,
          staffId: parsed.data.staffId,
          serviceId: parsed.data.serviceId,
        })
        .onConflictDoNothing();
    } else {
      await db
        .delete(staffServices)
        .where(
          and(
            eq(staffServices.businessId, parsed.data.businessId),
            eq(staffServices.staffId, parsed.data.staffId),
            eq(staffServices.serviceId, parsed.data.serviceId),
          ),
        );
    }

    revalidatePath("/inicio");
    return { error: null, success: "Servicios del profesional actualizados." };
  } catch (error) {
    console.error("No se pudo actualizar el servicio del profesional.", error);
    return {
      error:
        "No pudimos actualizar el servicio. Revisa si tiene citas asignadas.",
      success: null,
    };
  }
}

export async function createStaffInvitationAction(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const parsed = createStaffInvitationSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisa el correo ingresado.",
      inviteUrl: null,
    };
  }

  const baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL) {
    return { error: "BETTER_AUTH_URL no está configurada.", inviteUrl: null };
  }

  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return {
        error: "Tu sesión terminó. Inicia sesión de nuevo.",
        inviteUrl: null,
      };
    }

    const limit = await checkRateLimit({
      scope: "staff-invitation",
      identifier: session.user.id,
      maximum: 5,
      windowSeconds: 3_600,
    });
    if (!limit.allowed) {
      return {
        error:
          "Llegaste al máximo de invitaciones por ahora. Inténtalo más tarde.",
        inviteUrl: null,
      };
    }

    const { db } = await import("@/db");
    const { businesses, staff, staffInvitations, user } =
      await import("@/db/schema");
    const email = parsed.data.email.trim().toLowerCase();
    const [business] = await db
      .select({ id: businesses.id, name: businesses.name })
      .from(businesses)
      .where(
        and(
          eq(businesses.id, parsed.data.businessId),
          eq(businesses.ownerId, session.user.id),
        ),
      )
      .limit(1);
    if (!business) {
      return {
        error: "No encontramos el negocio o no tienes permiso para invitar.",
        inviteUrl: null,
      };
    }

    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(sql`lower(${user.email}) = ${email}`)
      .limit(1);
    if (existingUser) {
      const [existingStaffMember] = await db
        .select({ id: staff.id })
        .from(staff)
        .where(
          and(
            eq(staff.businessId, business.id),
            eq(staff.userId, existingUser.id),
          ),
        )
        .limit(1);
      if (existingStaffMember) {
        return {
          error: "Esa persona ya forma parte del equipo.",
          inviteUrl: null,
        };
      }
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000);

    await db
      .insert(staffInvitations)
      .values({
        businessId: business.id,
        email,
        tokenHash,
        invitedBy: session.user.id,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: [staffInvitations.businessId, staffInvitations.email],
        set: {
          tokenHash,
          invitedBy: session.user.id,
          expiresAt,
          acceptedAt: null,
          revokedAt: null,
          createdAt: now,
        },
      });

    const inviteUrl = new URL(`/invitaciones/${token}`, baseURL).toString();
    const emailStatus = await sendStaffInvitationNotification({
      to: email,
      businessName: business.name,
      inviterName: session.user.name,
      inviteUrl,
      expiresAt,
      idempotencyKey: tokenHash,
    });

    revalidatePath("/inicio");
    return {
      error: null,
      inviteUrl,
      emailStatus,
    };
  } catch (error) {
    console.error("No se pudo crear la invitación de equipo.", error);
    return {
      error: "No pudimos crear la invitación. Inténtalo de nuevo.",
      inviteUrl: null,
    };
  }
}

export async function revokeStaffInvitationAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const parsed = revokeStaffInvitationSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: "No pudimos revocar esta invitación.", success: null };
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
    const { businesses, staffInvitations } = await import("@/db/schema");
    const updated = await db
      .update(staffInvitations)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(staffInvitations.id, parsed.data.invitationId),
          eq(staffInvitations.businessId, parsed.data.businessId),
          isNull(staffInvitations.acceptedAt),
          isNull(staffInvitations.revokedAt),
          sql`exists (
            select 1 from ${businesses}
            where ${businesses.id} = ${staffInvitations.businessId}
              and ${businesses.ownerId} = ${session.user.id}
          )`,
        ),
      )
      .returning({ id: staffInvitations.id });

    if (updated.length === 0) {
      return {
        error:
          "La invitación ya fue aceptada, revocada o no pertenece a tu negocio.",
        success: null,
      };
    }

    revalidatePath("/inicio");
    return { error: null, success: "Invitación revocada." };
  } catch (error) {
    console.error("No se pudo revocar la invitación.", error);
    return {
      error: "No pudimos revocar la invitación. Inténtalo de nuevo.",
      success: null,
    };
  }
}

export async function acceptStaffInvitationAction(
  _previousState: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const parsed = acceptStaffInvitationSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: "El enlace de invitación no es válido.", success: null };
  }

  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return {
        error: "Inicia sesión con el correo al que se envió la invitación.",
        success: null,
      };
    }

    const { db } = await import("@/db");
    const { businesses, staffInvitations } = await import("@/db/schema");
    const tokenHash = createHash("sha256")
      .update(parsed.data.token)
      .digest("hex");
    const email = session.user.email.trim().toLowerCase();
    const now = new Date();
    const [invitation] = await db
      .select({
        id: staffInvitations.id,
        businessId: staffInvitations.businessId,
        email: staffInvitations.email,
        expiresAt: staffInvitations.expiresAt,
        acceptedAt: staffInvitations.acceptedAt,
        revokedAt: staffInvitations.revokedAt,
      })
      .from(staffInvitations)
      .innerJoin(businesses, eq(staffInvitations.businessId, businesses.id))
      .where(eq(staffInvitations.tokenHash, tokenHash))
      .limit(1);

    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt <= now
    ) {
      return {
        error: "Esta invitación venció o ya no está disponible.",
        success: null,
      };
    }
    if (invitation.email !== email) {
      return {
        error: "Inicia sesión con el correo al que se envió la invitación.",
        success: null,
      };
    }

    const acceptanceTime = new Date();
    const [acceptedRows] = await db.batch([
      db
        .update(staffInvitations)
        .set({ acceptedAt: acceptanceTime })
        .where(
          and(
            eq(staffInvitations.id, invitation.id),
            eq(staffInvitations.tokenHash, tokenHash),
            gt(staffInvitations.expiresAt, acceptanceTime),
            isNull(staffInvitations.acceptedAt),
            isNull(staffInvitations.revokedAt),
          ),
        )
        .returning({ businessId: staffInvitations.businessId }),
      db.execute(sql`
        INSERT INTO "staff" ("business_id", "user_id", "display_name")
        SELECT "business_id", ${session.user.id}::uuid, ${session.user.name}
        FROM "staff_invitations"
        WHERE "id" = ${invitation.id}::uuid
          AND "accepted_at" = ${acceptanceTime}
          AND "revoked_at" IS NULL
          AND lower("email") = ${email}
        ON CONFLICT ("business_id", "user_id") DO NOTHING
      `),
    ]);

    if (acceptedRows.length === 0) {
      return {
        error: "La invitación venció o ya fue utilizada.",
        success: null,
      };
    }

    revalidatePath("/inicio");
  } catch (error) {
    console.error("No se pudo aceptar la invitación de equipo.", error);
    return {
      error: "No pudimos aceptar la invitación. Inténtalo de nuevo.",
      success: null,
    };
  }

  redirect("/inicio");
}
