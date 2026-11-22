"use server";

import { and, eq, gt, lt, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { parseLocalDateTimeForTimeZone } from "@/features/availability/availability";
import {
  createTimeOffSchema,
  deleteTimeOffSchema,
} from "@/features/time-off/schemas";

export type TimeOffActionState = {
  error: string | null;
  success: string | null;
};

export async function createTimeOffAction(
  _previousState: TimeOffActionState,
  formData: FormData,
): Promise<TimeOffActionState> {
  const parsed = createTimeOffSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Revisa el período de ausencia.",
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
    const { appointments, businesses, staff, timeOff } =
      await import("@/db/schema");
    const [business] = await db
      .select({
        id: businesses.id,
        timezone: businesses.timezone,
        ownerId: businesses.ownerId,
      })
      .from(businesses)
      .where(eq(businesses.id, parsed.data.businessId))
      .limit(1);
    if (!business) {
      return {
        error: "No encontramos ese negocio.",
        success: null,
      };
    }

    const startsAt = parseLocalDateTimeForTimeZone(
      parsed.data.startDate,
      parsed.data.startTime,
      business.timezone,
    );
    const endsAt = parseLocalDateTimeForTimeZone(
      parsed.data.endDate,
      parsed.data.endTime,
      business.timezone,
    );
    if (!startsAt || !endsAt) {
      return {
        error: "Una de esas horas no existe en la zona horaria del negocio.",
        success: null,
      };
    }
    if (startsAt <= new Date()) {
      return {
        error: "La ausencia debe comenzar en el futuro.",
        success: null,
      };
    }
    if (startsAt >= endsAt) {
      return { error: "El final debe ser posterior al inicio.", success: null };
    }

    const [professional] = await db
      .select({ id: staff.id })
      .from(staff)
      .where(
        and(
          eq(staff.id, parsed.data.staffId),
          eq(staff.businessId, business.id),
        ),
      )
      .limit(1);

    if (!professional) {
      return {
        error: "No encontramos ese profesional en tu negocio.",
        success: null,
      };
    }

    if (business.ownerId !== session.user.id) {
      const [membership] = await db
        .select({ id: staff.id })
        .from(staff)
        .where(
          and(
            eq(staff.id, professional.id),
            eq(staff.userId, session.user.id),
            eq(staff.active, true),
          ),
        )
        .limit(1);
      if (!membership) {
        return {
          error: "Solo puedes gestionar tus propias ausencias.",
          success: null,
        };
      }
    }

    const [appointmentConflict] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.staffId, professional.id),
          ne(appointments.status, "cancelled"),
          lt(appointments.startsAt, endsAt),
          gt(appointments.endsAt, startsAt),
        ),
      )
      .limit(1);
    if (appointmentConflict) {
      return {
        error:
          "Ese período coincide con una cita. Revisa la agenda antes de guardarlo.",
        success: null,
      };
    }

    const [absenceConflict] = await db
      .select({ id: timeOff.id })
      .from(timeOff)
      .where(
        and(
          eq(timeOff.staffId, professional.id),
          lt(timeOff.startsAt, endsAt),
          gt(timeOff.endsAt, startsAt),
        ),
      )
      .limit(1);
    if (absenceConflict) {
      return {
        error: "Ese período coincide con otra ausencia registrada.",
        success: null,
      };
    }

    await db.insert(timeOff).values({
      id: randomUUID(),
      staffId: professional.id,
      startsAt,
      endsAt,
      reason: parsed.data.reason,
    });

    revalidatePath("/inicio");
    return { error: null, success: "Ausencia guardada." };
  } catch (error) {
    console.error("No se pudo guardar la ausencia.", error);
    return {
      error: "No pudimos guardar la ausencia. Inténtalo de nuevo.",
      success: null,
    };
  }
}

export async function deleteTimeOffAction(
  _previousState: TimeOffActionState,
  formData: FormData,
): Promise<TimeOffActionState> {
  const parsed = deleteTimeOffSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: "No pudimos eliminar esta ausencia.", success: null };
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
    const { businesses, staff, timeOff } = await import("@/db/schema");
    const [business] = await db
      .select({ id: businesses.id, ownerId: businesses.ownerId })
      .from(businesses)
      .where(eq(businesses.id, parsed.data.businessId))
      .limit(1);
    if (!business) {
      return {
        error: "No encontramos ese negocio.",
        success: null,
      };
    }

    const [professional] = await db
      .select({ id: staff.id })
      .from(staff)
      .where(
        and(
          eq(staff.id, parsed.data.staffId),
          eq(staff.businessId, business.id),
        ),
      )
      .limit(1);
    if (!professional) {
      return {
        error: "No encontramos el perfil profesional de este negocio.",
        success: null,
      };
    }

    if (business.ownerId !== session.user.id) {
      const [membership] = await db
        .select({ id: staff.id })
        .from(staff)
        .where(
          and(
            eq(staff.id, professional.id),
            eq(staff.userId, session.user.id),
            eq(staff.active, true),
          ),
        )
        .limit(1);
      if (!membership) {
        return {
          error: "Solo puedes gestionar tus propias ausencias.",
          success: null,
        };
      }
    }

    const deleted = await db
      .delete(timeOff)
      .where(
        and(
          eq(timeOff.id, parsed.data.timeOffId),
          eq(timeOff.staffId, professional.id),
        ),
      )
      .returning({ id: timeOff.id });
    if (deleted.length === 0) {
      return {
        error: "No encontramos esa ausencia en tu agenda.",
        success: null,
      };
    }

    revalidatePath("/inicio");
    return { error: null, success: "Ausencia eliminada." };
  } catch (error) {
    console.error("No se pudo eliminar la ausencia.", error);
    return {
      error: "No pudimos eliminar la ausencia. Inténtalo de nuevo.",
      success: null,
    };
  }
}
