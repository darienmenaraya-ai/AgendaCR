"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { findAvailableSlotsForService } from "@/features/availability/queries";
import { getLocalDateForInstant } from "@/features/availability/availability";
import {
  sendAppointmentRequestNotifications,
  sendAppointmentStatusNotification,
  sendClientCancellationNotification,
} from "@/lib/email";
import {
  createAppointmentSchema,
  cancelMyAppointmentSchema,
  updateAppointmentStatusSchema,
} from "@/features/appointments/schemas";
import { checkRateLimit } from "@/lib/rate-limit";

export type AppointmentActionState = {
  error: string | null;
  success: string | null;
};

export type AppointmentStatusActionState = {
  error: string | null;
  success: string | null;
};

export async function createAppointmentAction(
  _previousState: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  const parsed = createAppointmentSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Revisa los datos de la reserva.",
      success: null,
    };
  }

  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return {
        error: "Inicia sesión para confirmar tu reserva.",
        success: null,
      };
    }

    const limit = await checkRateLimit({
      scope: "create-appointment",
      identifier: session.user.id,
      maximum: 5,
      windowSeconds: 600,
    });
    if (!limit.allowed) {
      return {
        error:
          "Creaste varias solicitudes. Espera unos minutos antes de reservar otra.",
        success: null,
      };
    }

    const startsAt = new Date(parsed.data.startsAt);
    const { db } = await import("@/db");
    const { businesses, user } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [business] = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        timezone: businesses.timezone,
        ownerEmail: user.email,
      })
      .from(businesses)
      .innerJoin(user, eq(businesses.ownerId, user.id))
      .where(eq(businesses.id, parsed.data.businessId))
      .limit(1);

    if (!business) {
      return { error: "No encontramos ese negocio.", success: null };
    }

    const localDate = getLocalDateForInstant(startsAt, business.timezone);
    if (!localDate) {
      return {
        error: "No pudimos validar la zona horaria del negocio.",
        success: null,
      };
    }

    const availability = await findAvailableSlotsForService({
      businessId: parsed.data.businessId,
      serviceId: parsed.data.serviceId,
      date: localDate,
    });

    if (availability.status !== "ok") {
      return { error: "El servicio ya no está disponible.", success: null };
    }

    const requestedSlot = availability.slots.find(
      (slot) =>
        slot.staffId === parsed.data.staffId &&
        slot.startsAt.getTime() === startsAt.getTime(),
    );

    if (!requestedSlot) {
      return {
        error: "Ese horario acaba de cambiar. Elige otro espacio disponible.",
        success: null,
      };
    }

    const { appointments, services, staff } = await import("@/db/schema");
    const { and } = await import("drizzle-orm");
    const [appointmentDetails] = await db
      .select({
        serviceName: services.name,
        professionalName: staff.displayName,
      })
      .from(services)
      .innerJoin(staff, eq(staff.id, parsed.data.staffId))
      .where(
        and(
          eq(services.id, parsed.data.serviceId),
          eq(services.businessId, business.id),
          eq(staff.businessId, business.id),
        ),
      )
      .limit(1);

    if (!appointmentDetails) {
      return {
        error: "El servicio o profesional ya no está disponible.",
        success: null,
      };
    }

    const [createdAppointment] = await db
      .insert(appointments)
      .values({
        businessId: business.id,
        serviceId: parsed.data.serviceId,
        staffId: parsed.data.staffId,
        clientId: session.user.id,
        startsAt,
        endsAt: requestedSlot.endsAt,
        status: "pending",
        notes: parsed.data.notes,
      })
      .returning({ id: appointments.id });

    await sendAppointmentRequestNotifications({
      appointmentId: createdAppointment.id,
      businessName: business.name,
      businessOwnerEmail: business.ownerEmail,
      clientName: session.user.name,
      clientEmail: session.user.email,
      professionalName: appointmentDetails.professionalName,
      serviceName: appointmentDetails.serviceName,
      startsAt,
      timeZone: business.timezone,
    });

    revalidatePath("/inicio");
    return {
      error: null,
      success: "Solicitud enviada. El negocio debe confirmar tu cita.",
    };
  } catch (error) {
    if (hasPostgresCode(error, "23P01")) {
      return {
        error: "Ese horario acaba de ser reservado. Elige otro espacio.",
        success: null,
      };
    }

    console.error("No se pudo crear la cita.", error);
    return {
      error: "No pudimos enviar la solicitud. Inténtalo de nuevo.",
      success: null,
    };
  }
}

export async function updateAppointmentStatusAction(
  _previousState: AppointmentStatusActionState,
  formData: FormData,
): Promise<AppointmentStatusActionState> {
  const parsed = updateAppointmentStatusSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: "No pudimos actualizar esta cita.", success: null };
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
    const { appointments, businesses, staff } = await import("@/db/schema");
    const { and, eq, inArray, lt, or } = await import("drizzle-orm");
    const currentTime = new Date();
    const ownedBusinesses = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.ownerId, session.user.id));
    const businessIds = ownedBusinesses.map(({ id }) => id);
    const ownStaffMemberships = await db
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.userId, session.user.id), eq(staff.active, true)));
    const ownStaffIds = ownStaffMemberships.map(({ id }) => id);
    if (businessIds.length === 0 && ownStaffIds.length === 0) {
      return {
        error: "No encontramos una agenda que puedas administrar.",
        success: null,
      };
    }

    const allowedFromStatuses: ("pending" | "confirmed")[] =
      parsed.data.status === "confirmed"
        ? ["pending"]
        : parsed.data.status === "cancelled"
          ? ["pending", "confirmed"]
          : ["confirmed"];
    const statusConditions = [
      and(
        eq(appointments.id, parsed.data.appointmentId),
        or(
          ...(businessIds.length
            ? [inArray(appointments.businessId, businessIds)]
            : []),
          ...(ownStaffIds.length
            ? [inArray(appointments.staffId, ownStaffIds)]
            : []),
        ),
        inArray(appointments.status, allowedFromStatuses),
      ),
    ];

    if (
      parsed.data.status === "completed" ||
      parsed.data.status === "no_show"
    ) {
      statusConditions.push(lt(appointments.endsAt, currentTime));
    }

    const updated = await db
      .update(appointments)
      .set({ status: parsed.data.status })
      .where(and(...statusConditions))
      .returning({ id: appointments.id });

    if (updated.length === 0) {
      return {
        error: "La cita ya fue actualizada o no pertenece a tu negocio.",
        success: null,
      };
    }

    if (
      parsed.data.status === "confirmed" ||
      parsed.data.status === "cancelled"
    ) {
      try {
        const { appointments, businesses, services, staff, user } =
          await import("@/db/schema");
        const [appointment] = await db
          .select({
            appointmentId: appointments.id,
            businessName: businesses.name,
            clientName: user.name,
            clientEmail: user.email,
            professionalName: staff.displayName,
            serviceName: services.name,
            startsAt: appointments.startsAt,
            timeZone: businesses.timezone,
          })
          .from(appointments)
          .innerJoin(businesses, eq(appointments.businessId, businesses.id))
          .innerJoin(services, eq(appointments.serviceId, services.id))
          .innerJoin(staff, eq(appointments.staffId, staff.id))
          .innerJoin(user, eq(appointments.clientId, user.id))
          .where(eq(appointments.id, parsed.data.appointmentId))
          .limit(1);

        if (appointment) {
          await sendAppointmentStatusNotification({
            ...appointment,
            status: parsed.data.status,
          });
        }
      } catch (error) {
        console.error("No se pudo preparar la notificación de la cita.", error);
      }
    }

    revalidatePath("/inicio");
    return {
      error: null,
      success: appointmentStatusMessage(parsed.data.status),
    };
  } catch (error) {
    console.error("No se pudo actualizar el estado de la cita.", error);
    return {
      error: "No pudimos actualizar la cita. Inténtalo de nuevo.",
      success: null,
    };
  }
}

function appointmentStatusMessage(
  status: "confirmed" | "cancelled" | "completed" | "no_show",
): string {
  switch (status) {
    case "confirmed":
      return "Cita confirmada.";
    case "cancelled":
      return "Solicitud cancelada.";
    case "completed":
      return "Cita marcada como completada.";
    case "no_show":
      return "Cita marcada como inasistencia.";
  }
}

export async function cancelMyAppointmentAction(
  _previousState: AppointmentStatusActionState,
  formData: FormData,
): Promise<AppointmentStatusActionState> {
  const parsed = cancelMyAppointmentSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) {
    return { error: "No pudimos cancelar esta cita.", success: null };
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
    const { appointments } = await import("@/db/schema");
    const { and, eq, gt, inArray } = await import("drizzle-orm");
    const cancellationCutoff = new Date(Date.now() + 2 * 60 * 60 * 1_000);
    const updated = await db
      .update(appointments)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(appointments.id, parsed.data.appointmentId),
          eq(appointments.clientId, session.user.id),
          inArray(appointments.status, ["pending", "confirmed"]),
          gt(appointments.startsAt, cancellationCutoff),
        ),
      )
      .returning({ id: appointments.id });

    if (updated.length === 0) {
      return {
        error:
          "No se pudo cancelar: la cita cambió de estado o faltan menos de 2 horas.",
        success: null,
      };
    }

    try {
      const { appointments, businesses, services, staff, user } =
        await import("@/db/schema");
      const [appointment] = await db
        .select({
          appointmentId: appointments.id,
          businessName: businesses.name,
          professionalName: staff.displayName,
          serviceName: services.name,
          startsAt: appointments.startsAt,
          timeZone: businesses.timezone,
          businessOwnerEmail: user.email,
        })
        .from(appointments)
        .innerJoin(businesses, eq(appointments.businessId, businesses.id))
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .innerJoin(staff, eq(appointments.staffId, staff.id))
        .innerJoin(user, eq(businesses.ownerId, user.id))
        .where(
          and(
            eq(appointments.id, parsed.data.appointmentId),
            eq(appointments.clientId, session.user.id),
          ),
        )
        .limit(1);

      if (appointment) {
        await sendClientCancellationNotification({
          ...appointment,
          clientName: session.user.name,
        });
      }
    } catch (error) {
      console.error(
        "No se pudo preparar la notificación de cancelación.",
        error,
      );
    }

    revalidatePath("/inicio");
    return { error: null, success: "Tu cita fue cancelada." };
  } catch (error) {
    console.error("No se pudo cancelar la cita del cliente.", error);
    return {
      error: "No pudimos cancelar la cita. Inténtalo de nuevo.",
      success: null,
    };
  }
}

function hasPostgresCode(error: unknown, expectedCode: string): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (typeof current !== "object") return false;
    if ("code" in current && current.code === expectedCode) return true;
    current = "cause" in current ? current.cause : null;
  }
  return false;
}
