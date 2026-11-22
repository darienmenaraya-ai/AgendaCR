import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { appointments, services } from "@/db/schema";

export type BusinessDashboardMetrics = {
  businessId: string;
  pendingAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  completedServiceValueCrc: string;
};

export async function getBusinessDashboardMetrics(
  businessIds: string[],
  now: Date,
): Promise<BusinessDashboardMetrics[]> {
  if (businessIds.length === 0) return [];

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1_000);
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1_000);

  return db
    .select({
      businessId: appointments.businessId,
      pendingAppointments: sql<number>`count(*) filter (
        where ${appointments.status} = 'pending'
      )::int`,
      upcomingAppointments: sql<number>`count(*) filter (
        where ${appointments.status} = 'confirmed'
          and ${appointments.startsAt} >= ${now}
          and ${appointments.startsAt} < ${sevenDaysAhead}
      )::int`,
      completedAppointments: sql<number>`count(*) filter (
        where ${appointments.status} = 'completed'
          and ${appointments.startsAt} >= ${thirtyDaysAgo}
          and ${appointments.startsAt} < ${now}
      )::int`,
      completedServiceValueCrc: sql<string>`coalesce(
        sum(case
          when ${appointments.status} = 'completed'
            and ${appointments.startsAt} >= ${thirtyDaysAgo}
            and ${appointments.startsAt} < ${now}
          then ${services.priceCrc}
          else 0
        end),
        0
      )::text`,
    })
    .from(appointments)
    .innerJoin(
      services,
      and(
        eq(services.id, appointments.serviceId),
        eq(services.businessId, appointments.businessId),
      ),
    )
    .where(inArray(appointments.businessId, businessIds))
    .groupBy(appointments.businessId);
}
