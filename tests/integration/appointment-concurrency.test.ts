import { randomUUID } from "node:crypto";

import { neon } from "@neondatabase/serverless";
import { afterAll, describe, expect, it } from "vitest";

function getTestDatabaseUrl(): string {
  const testUrl = process.env.DATABASE_TEST_URL;
  if (!testUrl) {
    throw new Error(
      "Configura DATABASE_TEST_URL en .env.local con una rama aislada de Neon antes de ejecutar npm run test:db.",
    );
  }

  const appUrl = process.env.DATABASE_URL;
  if (appUrl) {
    const testHost = new URL(testUrl).hostname.replace("-pooler", "");
    const appHost = new URL(appUrl).hostname.replace("-pooler", "");
    if (testHost === appHost) {
      throw new Error(
        "DATABASE_TEST_URL apunta a la misma rama que DATABASE_URL. Usa una rama de prueba aislada.",
      );
    }
  }

  return testUrl;
}

const testUrl = getTestDatabaseUrl();
const sql = neon(testUrl);
const ownerId = randomUUID();
const clientIds = [randomUUID(), randomUUID()];
const businessId = randomUUID();
const staffId = randomUUID();
const serviceId = randomUUID();
const appointmentIds = [randomUUID(), randomUUID(), randomUUID()];
const timeOffId = randomUUID();
const uniqueSuffix = randomUUID();

describe("restricción PostgreSQL contra citas simultáneas", () => {
  afterAll(async () => {
    await sql`DELETE FROM time_off WHERE id = ${timeOffId}`;
    await sql`DELETE FROM appointments WHERE id IN (${appointmentIds[0]}, ${appointmentIds[1]})`;
    await sql`DELETE FROM appointments WHERE id = ${appointmentIds[2]}`;
    await sql`DELETE FROM staff_services WHERE staff_id = ${staffId}`;
    await sql`DELETE FROM services WHERE id = ${serviceId}`;
    await sql`DELETE FROM staff WHERE id = ${staffId}`;
    await sql`DELETE FROM businesses WHERE id = ${businessId}`;
    await sql`DELETE FROM users WHERE id IN (${ownerId}, ${clientIds[0]}, ${clientIds[1]})`;
  });

  it("permite solo una de dos reservas del mismo profesional y horario", async () => {
    const constraint = await sql`
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'appointments_no_overlapping_active'
        AND conrelid = 'appointments'::regclass
    `;
    expect(constraint).toHaveLength(1);

    await sql`
      INSERT INTO users (id, name, email)
      VALUES
        (${ownerId}, 'Concurrency test owner', ${`owner-${uniqueSuffix}@example.test`}),
        (${clientIds[0]}, 'Concurrency test client 1', ${`client-1-${uniqueSuffix}@example.test`}),
        (${clientIds[1]}, 'Concurrency test client 2', ${`client-2-${uniqueSuffix}@example.test`})
    `;
    await sql`
      INSERT INTO businesses (id, owner_id, name, slug)
      VALUES (${businessId}, ${ownerId}, 'Concurrency test', ${`test-${uniqueSuffix}`})
    `;
    await sql`
      INSERT INTO services (id, business_id, name, duration_minutes, price_crc)
      VALUES (${serviceId}, ${businessId}, 'Test service', 30, 1000)
    `;
    await sql`
      INSERT INTO staff (id, business_id, user_id, display_name)
      VALUES (${staffId}, ${businessId}, ${ownerId}, 'Test professional')
    `;
    await sql`
      INSERT INTO staff_services (staff_id, service_id, business_id)
      VALUES (${staffId}, ${serviceId}, ${businessId})
    `;

    const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const attempts = await Promise.allSettled(
      clientIds.map(
        (clientId, index) =>
          sql`
          INSERT INTO appointments (
            id, business_id, staff_id, service_id, client_id, starts_at, ends_at
          ) VALUES (
            ${appointmentIds[index]}, ${businessId}, ${staffId}, ${serviceId},
            ${clientId}, ${startsAt}, ${endsAt}
          )
        `,
      ),
    );

    const successes = attempts.filter(
      (attempt) => attempt.status === "fulfilled",
    );
    const failures = attempts.filter(
      (attempt) => attempt.status === "rejected",
    );

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    if (failures[0]?.status === "rejected") {
      expect(failures[0].reason).toMatchObject({ code: "23P01" });
    }

    const timeOffStartsAt = new Date(
      Date.now() + 2 * 60 * 60 * 1000,
    ).toISOString();
    const timeOffEndsAt = new Date(Date.now() + 150 * 60 * 1000).toISOString();
    const appointmentAndTimeOffAttempts = await Promise.allSettled([
      sql`
        INSERT INTO appointments (
          id, business_id, staff_id, service_id, client_id, starts_at, ends_at
        ) VALUES (
          ${appointmentIds[2]}, ${businessId}, ${staffId}, ${serviceId},
          ${clientIds[0]}, ${timeOffStartsAt}, ${timeOffEndsAt}
        )
      `,
      sql`
        INSERT INTO time_off (id, staff_id, starts_at, ends_at, reason)
        VALUES (
          ${timeOffId}, ${staffId}, ${timeOffStartsAt}, ${timeOffEndsAt},
          'Concurrency test'
        )
      `,
    ]);
    const acceptedConflicts = appointmentAndTimeOffAttempts.filter(
      (attempt) => attempt.status === "fulfilled",
    );
    const rejectedConflicts = appointmentAndTimeOffAttempts.filter(
      (attempt) => attempt.status === "rejected",
    );

    expect(acceptedConflicts).toHaveLength(1);
    expect(rejectedConflicts).toHaveLength(1);
    if (rejectedConflicts[0]?.status === "rejected") {
      expect(rejectedConflicts[0].reason).toMatchObject({ code: "23P01" });
    }
  });
});
