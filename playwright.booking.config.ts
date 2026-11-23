import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

loadEnv({ path: ".env.local" });

const testDatabaseUrl = process.env.DATABASE_TEST_URL;
const testPort = process.env.AGENDA_BOOKING_TEST_PORT ?? "3001";
const testBaseUrl = `http://localhost:${testPort}`;
const originalApplicationDatabaseUrl =
  process.env.AGENDA_MAIN_DATABASE_URL ?? process.env.DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    "Configura DATABASE_TEST_URL en .env.local con la rama aislada de Neon antes de ejecutar npm run test:e2e:booking.",
  );
}

if (originalApplicationDatabaseUrl) {
  const testHost = new URL(testDatabaseUrl).hostname.replace("-pooler", "");
  const applicationHost = new URL(
    originalApplicationDatabaseUrl,
  ).hostname.replace("-pooler", "");
  if (testHost === applicationHost) {
    throw new Error(
      "DATABASE_TEST_URL apunta a la misma rama que DATABASE_URL. Usa una rama aislada de Neon.",
    );
  }
}

process.env.AGENDA_MAIN_DATABASE_URL ??= process.env.DATABASE_URL;
process.env.DATABASE_URL = testDatabaseUrl;
process.env.BETTER_AUTH_URL = testBaseUrl;
process.env.PLAYWRIGHT_BOOKING_E2E = "1";

export default defineConfig({
  testDir: "./tests/e2e/booking",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "./test-results/booking-playwright",
  globalSetup: "./tests/e2e/booking/global-setup.ts",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: testBaseUrl,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${testPort}`,
    url: testBaseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
