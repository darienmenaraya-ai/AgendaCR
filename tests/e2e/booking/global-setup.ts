import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { neon } from "@neondatabase/serverless";

const fixturePath = path.join(
  process.cwd(),
  "test-results",
  "booking-fixture.json",
);
const timeZone = "America/Costa_Rica";

type BookingFixture = {
  businessId: string;
  slug: string;
  ownerId: string;
  serviceId: string;
  staffId: string;
  date: string;
  clientEmail: string;
  clientName: string;
  clientPassword: string;
};

export default async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !process.env.PLAYWRIGHT_BOOKING_E2E) {
    throw new Error(
      "La prueba de reservas debe usar su configuración aislada.",
    );
  }

  const sql = neon(databaseUrl);
  const rateLimitSnapshot = await sql`
    SELECT key, count, last_request FROM rate_limit
  `;
  await sql`DELETE FROM rate_limit`;
  const runId = randomUUID();
  const fixture: BookingFixture = {
    businessId: randomUUID(),
    slug: `e2e-${runId}`,
    ownerId: randomUUID(),
    serviceId: randomUUID(),
    staffId: randomUUID(),
    date: getTomorrowLocalDate(),
    clientEmail: `booking-e2e-${runId}@example.test`,
    clientName: "Cliente de prueba AgendaCR",
    clientPassword: `AgendaCR-${runId}-Safe9!`,
  };
  const weekday = new Date(`${fixture.date}T00:00:00Z`).getUTCDay();

  try {
    await sql`
      INSERT INTO users (id, name, email)
      VALUES (${fixture.ownerId}, 'Propietario de prueba AgendaCR', ${`owner-${runId}@example.test`})
    `;
    await sql`
      INSERT INTO businesses (id, owner_id, name, slug, timezone)
      VALUES (${fixture.businessId}, ${fixture.ownerId}, 'Negocio de prueba AgendaCR', ${fixture.slug}, ${timeZone})
    `;
    await sql`
      INSERT INTO services (id, business_id, name, duration_minutes, price_crc)
      VALUES (${fixture.serviceId}, ${fixture.businessId}, 'Servicio de prueba', 30, 5000)
    `;
    await sql`
      INSERT INTO staff (id, business_id, user_id, display_name)
      VALUES (${fixture.staffId}, ${fixture.businessId}, ${fixture.ownerId}, 'Profesional de prueba')
    `;
    await sql`
      INSERT INTO staff_services (staff_id, service_id, business_id)
      VALUES (${fixture.staffId}, ${fixture.serviceId}, ${fixture.businessId})
    `;
    await sql`
      INSERT INTO working_hours (staff_id, weekday, start_time, end_time)
      VALUES (${fixture.staffId}, ${weekday}, '08:00', '18:00')
    `;

    await mkdir(path.dirname(fixturePath), { recursive: true });
    await writeFile(fixturePath, JSON.stringify(fixture), "utf8");
  } catch (error) {
    await cleanFixture(databaseUrl, fixture);
    throw error;
  }

  return async () => {
    try {
      await cleanFixture(databaseUrl, fixture);
    } finally {
      const currentSql = neon(databaseUrl);
      const previousByKey = new Map(
        rateLimitSnapshot.map((row) => [row.key, row]),
      );
      const currentCounters = await currentSql`SELECT key FROM rate_limit`;

      for (const counter of currentCounters) {
        const previous = previousByKey.get(counter.key);
        if (previous) {
          await currentSql`
            UPDATE rate_limit
            SET count = ${previous.count}, last_request = ${previous.last_request}
            WHERE key = ${counter.key}
          `;
        } else {
          await currentSql`DELETE FROM rate_limit WHERE key = ${counter.key}`;
        }
      }

      for (const previous of rateLimitSnapshot) {
        await currentSql`
          INSERT INTO rate_limit (key, count, last_request)
          VALUES (${previous.key}, ${previous.count}, ${previous.last_request})
          ON CONFLICT (key) DO UPDATE SET
            count = EXCLUDED.count,
            last_request = EXCLUDED.last_request
        `;
      }

      await import("node:fs/promises").then(({ rm }) =>
        rm(fixturePath, { force: true }),
      );
    }
  };
}

async function cleanFixture(databaseUrl: string, fixture: BookingFixture) {
  const sql = neon(databaseUrl);
  await sql`DELETE FROM appointments WHERE business_id = ${fixture.businessId}`;
  await sql`DELETE FROM staff_services WHERE business_id = ${fixture.businessId}`;
  await sql`DELETE FROM businesses WHERE id = ${fixture.businessId}`;
  await sql`DELETE FROM users WHERE email = ${fixture.clientEmail}`;
  await sql`DELETE FROM users WHERE id = ${fixture.ownerId}`;
}

function getTomorrowLocalDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const tomorrow = new Date(
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day) + 1,
    ),
  );
  return [
    tomorrow.getUTCFullYear(),
    String(tomorrow.getUTCMonth() + 1).padStart(2, "0"),
    String(tomorrow.getUTCDate()).padStart(2, "0"),
  ].join("-");
}
