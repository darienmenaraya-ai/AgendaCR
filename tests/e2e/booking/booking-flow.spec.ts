import { readFile } from "node:fs/promises";
import path from "node:path";

import { neon } from "@neondatabase/serverless";
import { expect, test } from "@playwright/test";

type BookingFixture = {
  businessId: string;
  slug: string;
  staffId: string;
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
  const sql = neon(process.env.DATABASE_URL!);

  await page.goto(
    `/registro?callbackURL=${encodeURIComponent(`/${fixture.slug}`)}`,
  );
  await page.getByLabel("Nombre completo").fill(fixture.clientName);
  await page.getByLabel("Correo electrónico").fill(fixture.clientEmail);
  await page.getByLabel("Contraseña").fill(fixture.clientPassword);
  const signupResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/sign-up/email"),
  );
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  const signupResponse = await signupResponsePromise;
  expect(
    signupResponse.ok(),
    `El servidor de registro respondió HTTP ${signupResponse.status()}.`,
  ).toBe(true);

  const signupResult = (await signupResponse.json()) as {
    token: string | null;
  };
  if (signupResult.token === null) {
    await expect(
      page.getByRole("heading", { name: "Revisa tu correo" }),
    ).toBeVisible();
    await sql`
      UPDATE users SET email_verified = true WHERE email = ${fixture.clientEmail}
    `;
    await page.goto(
      `/iniciar-sesion?callbackURL=${encodeURIComponent(`/${fixture.slug}`)}`,
    );
    await page.getByLabel("Correo electrónico").fill(fixture.clientEmail);
    await page.getByLabel("Contraseña").fill(fixture.clientPassword);
    await page.getByRole("button", { name: "Entrar a mi cuenta" }).click();
  }

  await expect(page.locator("form p[role='alert']")).toBeHidden({
    timeout: 10_000,
  });
  await expect(page).toHaveURL(new RegExp(`/${fixture.slug}$`));
  await expect(
    page.getByRole("heading", { name: "Solicita una cita" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 320, height: 740 });
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.getByLabel("Fecha").fill(fixture.date);
  const availableSlot = page.getByRole("radio").first();
  await expect(availableSlot).toBeVisible({ timeout: 15_000 });
  await availableSlot.focus();
  await page.keyboard.press("Space");
  await expect(availableSlot).toBeChecked();

  const submitButton = page.getByRole("button", { name: /solicitar cita/i });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  await expect(
    page.getByRole("heading", { name: "Solicitud enviada" }),
  ).toBeVisible({ timeout: 15_000 });

  const appointments = await sql`
    SELECT id, status
    FROM appointments
    WHERE business_id = ${fixture.businessId}
      AND client_id = (SELECT id FROM users WHERE email = ${fixture.clientEmail})
  `;
  expect(appointments).toHaveLength(1);
  expect(appointments[0]?.status).toBe("pending");

  const [testClient] = await sql`
    SELECT id FROM users WHERE email = ${fixture.clientEmail}
  `;
  expect(testClient?.id).toBeTruthy();
  await sql`
    UPDATE staff SET user_id = ${testClient.id}
    WHERE id = ${fixture.staffId}
  `;
  await sql`
    UPDATE businesses SET owner_id = ${testClient.id}
    WHERE id = ${fixture.businessId}
  `;

  await page.goto("/inicio");
  await expect(
    page.getByRole("heading", { name: "Profesionales" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Calendario de Negocio de prueba AgendaCR",
    }),
  ).toBeVisible();
  await expect(page.locator(".calendar-shell [role='alert']")).toBeHidden({
    timeout: 15_000,
  });
  if (isTomorrowInNextCalendarWeek()) {
    await page.getByRole("button", { name: "Semana siguiente" }).click();
  }
  const calendarAppointment = page
    .locator(".calendar-shell")
    .getByRole("button", { name: /Servicio de prueba/ });
  await expect(calendarAppointment).toBeVisible({ timeout: 15_000 });
  await calendarAppointment.click();
  const appointmentDetails = page.getByRole("complementary", {
    name: "Detalles de la cita seleccionada",
  });
  await expect(appointmentDetails).toContainText("Cliente de prueba AgendaCR");
  const calendarTitle = page
    .locator(".calendar-shell")
    .getByRole("heading", { name: /nov 2026/i });
  const calendarTitleIsClipped = await calendarTitle.evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  expect(calendarTitleIsClipped).toBe(false);
  const dashboardHasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(dashboardHasHorizontalOverflow).toBe(false);
  await page.screenshot({
    path: "test-results/owner-dashboard-mobile.png",
    fullPage: true,
  });
});

function isTomorrowInNextCalendarWeek(): boolean {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const date = Object.fromEntries(
    dateParts.map((part) => [part.type, part.value]),
  );
  const localDate = `${date.year}-${date.month}-${date.day}`;
  return new Date(`${localDate}T00:00:00Z`).getUTCDay() === 0;
}
