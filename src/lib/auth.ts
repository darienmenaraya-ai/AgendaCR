import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";

import { db } from "@/db";
import { account, rateLimit, session, user, verification } from "@/db/schema";
import { consumeAuthRateLimit } from "@/lib/rate-limit";

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL;

if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET debe tener al menos 32 caracteres.");
}

if (!baseURL) {
  throw new Error("BETTER_AUTH_URL no está definida en el entorno.");
}

export const auth = betterAuth({
  appName: "AgendaCR",
  baseURL,
  secret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, rateLimit },
  }),
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 120,
    customStorage: { consume: consumeAuthRateLimit },
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 3_600, max: 5 },
    },
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  emailAndPassword: {
    enabled: true,
  },
});
