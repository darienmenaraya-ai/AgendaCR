import { and, eq, gte, lt } from "drizzle-orm";

import { sendAppointmentReminderNotification } from "@/lib/email";
import { hasValidCronAuthorization } from "@/lib/cron-auth";

export const maxDuration = 60;

const REMINDER_WINDOW_MS = 30 * 60 * 1_000;
const REMINDER_LEAD_TIME_MS = 24 * 60 * 60 * 1_000;
const MAX_REMINDERS_PER_RUN = 200;
const CONCURRENCY = 10;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!hasValidCronAuthorization(request, cronSecret)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return Response.json(
      { error: "Configura Resend para enviar recordatorios." },
      { status: 503 },
    );
  }

  try {
    const { db } = await import("@/db");
    const { appointments, businesses, services, staff, user } =
      await import("@/db/schema");
    const now = new Date();
    const windowStart = new Date(
      now.getTime() + REMINDER_LEAD_TIME_MS - REMINDER_WINDOW_MS,
    );
    const windowEnd = new Date(
      now.getTime() + REMINDER_LEAD_TIME_MS + REMINDER_WINDOW_MS,
    );
    const appointmentsToRemind = await db
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
      .where(
        and(
          eq(appointments.status, "confirmed"),
          gte(appointments.startsAt, windowStart),
          lt(appointments.startsAt, windowEnd),
        ),
      )
      .orderBy(appointments.startsAt)
      .limit(MAX_REMINDERS_PER_RUN);

    for (
      let index = 0;
      index < appointmentsToRemind.length;
      index += CONCURRENCY
    ) {
      const batch = appointmentsToRemind.slice(index, index + CONCURRENCY);
      await Promise.all(
        batch.map((appointment) =>
          sendAppointmentReminderNotification(appointment),
        ),
      );
    }

    return Response.json({ remindersProcessed: appointmentsToRemind.length });
  } catch (error) {
    console.error("No se pudieron procesar los recordatorios de citas.", error);
    return Response.json(
      { error: "No pudimos procesar los recordatorios." },
      { status: 500 },
    );
  }
}
