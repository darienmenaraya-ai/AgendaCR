import { and, eq, gt, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { connection } from "next/server";

import { appointmentCalendarQuerySchema } from "@/features/appointments/calendar-schemas";

const MAX_RANGE_MS = 62 * 24 * 60 * 60 * 1_000;

export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const parsed = appointmentCalendarQuerySchema.safeParse({
    businessId: url.searchParams.get("businessId"),
    start: url.searchParams.get("start"),
    end: url.searchParams.get("end"),
    staffId: url.searchParams.get("staffId") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      { error: "Indica un negocio y un periodo de fechas válidos." },
      { status: 400 },
    );
  }

  const start = new Date(parsed.data.start);
  const end = new Date(parsed.data.end);
  if (end <= start || end.getTime() - start.getTime() > MAX_RANGE_MS) {
    return Response.json(
      { error: "El periodo del calendario no es válido." },
      { status: 400 },
    );
  }

  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return Response.json(
        { error: "Inicia sesión para continuar." },
        { status: 401 },
      );
    }

    const { db } = await import("@/db");
    const { appointments, businesses, services, staff, user } =
      await import("@/db/schema");
    const business = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(
        and(
          eq(businesses.id, parsed.data.businessId),
          eq(businesses.ownerId, session.user.id),
        ),
      )
      .limit(1);

    let authorizedStaffId: string | undefined;
    if (parsed.data.staffId) {
      const membership = await db
        .select({ id: staff.id })
        .from(staff)
        .where(
          and(
            eq(staff.id, parsed.data.staffId),
            eq(staff.businessId, parsed.data.businessId),
            eq(staff.userId, session.user.id),
            eq(staff.active, true),
          ),
        )
        .limit(1);
      if (membership.length === 0) {
        return Response.json(
          { error: "No encontramos esa agenda." },
          { status: 404 },
        );
      }
      authorizedStaffId = membership[0].id;
    } else if (business.length === 0) {
      return Response.json(
        { error: "No encontramos ese negocio." },
        { status: 404 },
      );
    }

    const staffFilter = authorizedStaffId
      ? [eq(appointments.staffId, authorizedStaffId)]
      : [];
    const rows = await db
      .select({
        id: appointments.id,
        start: appointments.startsAt,
        end: appointments.endsAt,
        serviceName: services.name,
        clientName: user.name,
        professionalName: staff.displayName,
        status: appointments.status,
        notes: appointments.notes,
      })
      .from(appointments)
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .innerJoin(staff, eq(appointments.staffId, staff.id))
      .innerJoin(user, eq(appointments.clientId, user.id))
      .where(
        and(
          eq(appointments.businessId, parsed.data.businessId),
          lt(appointments.startsAt, end),
          gt(appointments.endsAt, start),
          ...staffFilter,
        ),
      )
      .orderBy(appointments.startsAt)
      .limit(5_000);

    return Response.json(
      rows.map((appointment) => ({
        ...appointment,
        start: appointment.start.toISOString(),
        end: appointment.end.toISOString(),
      })),
    );
  } catch (error) {
    console.error("No se pudo consultar el calendario de citas.", error);
    return Response.json(
      { error: "No pudimos cargar las citas del calendario." },
      { status: 500 },
    );
  }
}
