import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

const testDatabaseUrl = process.env.DATABASE_TEST_URL;
const appDatabaseUrl = process.env.DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    "Define DATABASE_TEST_URL en .env.local para migrar solo la rama Neon de pruebas.",
  );
}

if (
  appDatabaseUrl &&
  new URL(testDatabaseUrl).hostname.replace("-pooler", "") ===
    new URL(appDatabaseUrl).hostname.replace("-pooler", "")
) {
  throw new Error(
    "DATABASE_TEST_URL apunta a la misma rama que DATABASE_URL. No se aplicaron migraciones.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle-test",
  dialect: "postgresql",
  dbCredentials: { url: testDatabaseUrl },
  migrations: {
    schema: "drizzle_test",
    table: "__drizzle_migrations",
  },
});
