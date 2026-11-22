"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  reportPaymentSchema,
  reviewPaymentSchema,
} from "@/features/payments/schemas";

export type PaymentActionState = {
  error: string | null;
  success: string | null;
};

export async function reportPaymentAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const parsed = reportPaymentSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisa los datos del pago.",
      success: null,
    };
  }

  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { error: "Inicia sesión para reportar un pago.", success: null };
    }

    const { db } = await import("@/db");
    const { appointments, payments } = await import("@/db/schema");
    const { and, eq, inArray } = await import("drizzle-orm");
    const [appointment] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.id, parsed.data.appointmentId),
          eq(appointments.clientId, session.user.id),
          inArray(appointments.status, ["pending", "confirmed", "completed"]),
        ),
      )
      .limit(1);

    if (!appointment) {
      return {
        error:
          "No encontramos una cita tuya en la que puedas reportar un pago.",
        success: null,
      };
    }

    await db.insert(payments).values({
      appointmentId: appointment.id,
      amountCrc: parsed.data.amountCrc,
      reference: parsed.data.reference,
      reportedBy: session.user.id,
    });

    revalidatePath("/inicio");
    return {
      error: null,
      success: "Pago reportado. El negocio revisará la referencia SINPE.",
    };
  } catch (error) {
    console.error("No se pudo reportar el pago SINPE.", error);
    return {
      error: "No pudimos reportar el pago. Inténtalo de nuevo.",
      success: null,
    };
  }
}

export async function reviewPaymentAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const parsed = reviewPaymentSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Revisa la revisión del pago.",
      success: null,
    };
  }

  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return { error: "Inicia sesión para revisar los pagos.", success: null };
    }

    const { db } = await import("@/db");
    const { appointments, businesses, payments, staff } =
      await import("@/db/schema");
    const { and, eq, exists, inArray, or, sql } = await import("drizzle-orm");
    const memberships = await db
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.userId, session.user.id), eq(staff.active, true)));
    const ownStaffIds = memberships.map(({ id }) => id);
    const appointmentAccess = db
      .select({ one: sql`1` })
      .from(appointments)
      .innerJoin(businesses, eq(appointments.businessId, businesses.id))
      .where(
        and(
          eq(appointments.id, payments.appointmentId),
          or(
            eq(businesses.ownerId, session.user.id),
            ...(ownStaffIds.length
              ? [inArray(appointments.staffId, ownStaffIds)]
              : []),
          ),
        ),
      );

    const reviewedAt = new Date();
    const updated = await db
      .update(payments)
      .set({
        status: parsed.data.status,
        reviewNote:
          parsed.data.status === "rejected" ? parsed.data.reviewNote : null,
        reviewedBy: session.user.id,
        reviewedAt,
      })
      .where(
        and(
          eq(payments.id, parsed.data.paymentId),
          eq(payments.status, "reported"),
          exists(appointmentAccess),
        ),
      )
      .returning({ id: payments.id });

    if (updated.length === 0) {
      return {
        error: "El pago ya fue revisado o no pertenece a tu agenda.",
        success: null,
      };
    }

    revalidatePath("/inicio");
    return {
      error: null,
      success:
        parsed.data.status === "verified"
          ? "Pago verificado."
          : "Pago rechazado; el cliente podrá ver el motivo.",
    };
  } catch (error) {
    console.error("No se pudo revisar el pago SINPE.", error);
    return {
      error: "No pudimos revisar el pago. Inténtalo de nuevo.",
      success: null,
    };
  }
}
