import { and, eq, gt, inArray, lt, ne } from "drizzle-orm";

import {
  calculateAvailability,
  getUtcRangeForLocalDate,
  getWeekdayForLocalDate,
} from "@/features/availability/availability";

export type PublicAvailableSlot = {
  staffId: string;
  staffName: string;
  startsAt: Date;
  endsAt: Date;
};

export type AvailabilityLookup =
  | { status: "business-not-found" }
  | { status: "service-not-found" }
  | { status: "invalid-timezone" }
  | { status: "ok"; timeZone: string; slots: PublicAvailableSlot[] };

export async function findAvailableSlotsForService({
  businessId,
  serviceId,
  date,
  now = new Date(),
}: {
  businessId: string;
  serviceId: string;
  date: string;
  now?: Date;
}): Promise<AvailabilityLookup> {
  const { db } = await import("@/db");
  const {
    appointments,
    businesses,
    services,
    staff,
    staffServices,
    timeOff,
    workingHours,
  } = await import("@/db/schema");
  const [business] = await db
    .select({ id: businesses.id, timezone: businesses.timezone })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  if (!business) return { status: "business-not-found" };

  const [service] = await db
    .select({ id: services.id, durationMinutes: services.durationMinutes })
    .from(services)
    .where(
      and(
        eq(services.id, serviceId),
        eq(services.businessId, business.id),
        eq(services.active, true),
      ),
    )
    .limit(1);

  if (!service) return { status: "service-not-found" };

  const dayRange = getUtcRangeForLocalDate(date, business.timezone);
  if (!dayRange) return { status: "invalid-timezone" };

  const weekday = getWeekdayForLocalDate(date);
  const availableStaff = await db
    .select({ id: staff.id, displayName: staff.displayName })
    .from(staffServices)
    .innerJoin(staff, eq(staffServices.staffId, staff.id))
    .where(
      and(
        eq(staffServices.businessId, business.id),
        eq(staffServices.serviceId, service.id),
        eq(staff.active, true),
      ),
    );
  const staffIds = availableStaff.map(({ id }) => id);

  if (staffIds.length === 0) {
    return { status: "ok", timeZone: business.timezone, slots: [] };
  }

  const [hours, timeOffRows, appointmentRows] = await Promise.all([
    db
      .select({
        staffId: workingHours.staffId,
        startTime: workingHours.startTime,
        endTime: workingHours.endTime,
      })
      .from(workingHours)
      .where(
        and(
          inArray(workingHours.staffId, staffIds),
          eq(workingHours.weekday, weekday),
        ),
      ),
    db
      .select({
        staffId: timeOff.staffId,
        startsAt: timeOff.startsAt,
        endsAt: timeOff.endsAt,
      })
      .from(timeOff)
      .where(
        and(
          inArray(timeOff.staffId, staffIds),
          lt(timeOff.startsAt, dayRange.endsAt),
          gt(timeOff.endsAt, dayRange.startsAt),
        ),
      ),
    db
      .select({
        staffId: appointments.staffId,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.businessId, business.id),
          inArray(appointments.staffId, staffIds),
          ne(appointments.status, "cancelled"),
          lt(appointments.startsAt, dayRange.endsAt),
          gt(appointments.endsAt, dayRange.startsAt),
        ),
      ),
  ]);

  const slots = availableStaff.flatMap(({ id: staffId, displayName }) =>
    calculateAvailability({
      date,
      timeZone: business.timezone,
      durationMinutes: service.durationMinutes,
      workingIntervals: hours
        .filter((interval) => interval.staffId === staffId)
        .map(({ startTime, endTime }) => ({ startTime, endTime })),
      blockedIntervals: [
        ...timeOffRows.filter((block) => block.staffId === staffId),
        ...appointmentRows.filter((block) => block.staffId === staffId),
      ],
      now,
    }).map(({ startsAt, endsAt }) => ({
      staffId,
      staffName: displayName,
      startsAt,
      endsAt,
    })),
  );

  slots.sort(
    (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
  );
  return { status: "ok", timeZone: business.timezone, slots };
}
