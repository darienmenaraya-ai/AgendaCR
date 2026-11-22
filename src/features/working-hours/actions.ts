"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { weeklyScheduleSchema } from "@/features/working-hours/schemas";

export type ScheduleActionState = {
  error: string | null;
  success: string | null;
};

const daysOfWeek = [0, 1, 2, 3, 4, 5, 6] as const;

export async function saveWeeklyScheduleAction(
  _previousState: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const parsed = weeklyScheduleSchema.safeParse({
    businessId: formData.get("businessId"),
    staffId: formData.get("staffId"),
    days: daysOfWeek.map((weekday) => ({
      weekday,
      isOpen: formData.get(`open-${weekday}`) === "on",
      startTime: formData.get(`start-${weekday}`) ?? "",
      endTime: formData.get(`end-${weekday}`) ?? "",
    })),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Revisa los horarios seleccionados.",
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
    const { businesses, staff, workingHours } = await import("@/db/schema");
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
          error: "Solo puedes editar tu propio horario.",
          success: null,
        };
      }
    }

    const intervals = parsed.data.days
      .filter((day) => day.isOpen)
      .map((day) => ({
        id: randomUUID(),
        staffId: professional.id,
        weekday: day.weekday,
        startTime: day.startTime,
        endTime: day.endTime,
      }));

    if (intervals.length > 0) {
      await db.batch([
        db
          .delete(workingHours)
          .where(eq(workingHours.staffId, professional.id)),
        db.insert(workingHours).values(intervals),
      ]);
    } else {
      await db
        .delete(workingHours)
        .where(eq(workingHours.staffId, professional.id));
    }

    revalidatePath("/inicio");
    return { error: null, success: "Horarios guardados correctamente." };
  } catch (error) {
    console.error("No se pudieron guardar los horarios.", error);
    return {
      error: "No pudimos guardar los horarios. Inténtalo de nuevo.",
      success: null,
    };
  }
}
