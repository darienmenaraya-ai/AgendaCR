import { readFile } from "node:fs/promises";
import path from "node:path";

import { neon } from "@neondatabase/serverless";
import { expect, test } from "@playwright/test";

type BookingFixture = {
  businessId: string;
  slug: string;
  date: string;
  clientEmail: string;
  clientName: string;
  clientPassword: string;
};

const fixturePath = path.join(
  process.cwd(),
  "test-results",
  "booking-fixture.json",
);

test("una persona puede registrarse, elegir un espacio y solicitar una cita", async ({
  page,
}) => {
  test.setTimeout(60_000);

  const fixture = JSON.parse(
    await readFile(fixturePath, "utf8"),
  ) as BookingFixture;

  await page.goto(
    `/registro?callbackURL=${encodeURIComponent(`/${fixture.slug}`)}`,
  );
  await page.getByLabel("Nombre completo").fill(fixture.clientName);
  await page.getByLabel("Correo electrónico").fill(fixture.clientEmail);
  await page.getByLabel("Contraseña").fill(fixture.clientPassword);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await expect(page.locator("form p[role='alert']")).toBeHidden({
    timeout: 10_000,
  });
  await expect(page).toHaveURL(new RegExp(`/${fixture.slug}$`));
  await expect(
    page.getByRole("heading", { name: "Solicita una cita" }),
  ).toBeVisible();

  await page.getByLabel("Fecha").fill(fixture.date);
  const availableSlot = page.getByRole("radio").first();
  await expect(availableSlot).toBeVisible({ timeout: 15_000 });
  await availableSlot.locator("xpath=..").click();

  const submitButton = page.getByRole("button", { name: /solicitar cita/i });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  await expect(
    page.getByRole("heading", { name: "Solicitud enviada" }),
  ).toBeVisible({ timeout: 15_000 });

  const sql = neon(process.env.DATABASE_URL!);
  const appointments = await sql`
    SELECT id, status
    FROM appointments
    WHERE business_id = ${fixture.businessId}
      AND client_id = (SELECT id FROM users WHERE email = ${fixture.clientEmail})
  `;
  expect(appointments).toHaveLength(1);
  expect(appointments[0]?.status).toBe("pending");
});
