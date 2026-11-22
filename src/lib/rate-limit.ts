import { createHmac } from "node:crypto";
import { isIP } from "node:net";

import { lt, sql } from "drizzle-orm";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export function evaluateRateLimit({
  count,
  maximum,
  windowStartedAt,
  windowSeconds,
  now,
}: {
  count: number;
  maximum: number;
  windowStartedAt: number;
  windowSeconds: number;
  now: number;
}): RateLimitResult {
  const windowExpired = windowStartedAt + windowSeconds * 1_000 <= now;
  return {
    allowed: windowExpired || count <= maximum,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((windowStartedAt + windowSeconds * 1_000 - now) / 1_000),
    ),
  };
}

/** Use the last proxy-added address; do not persist raw IP addresses. */
export function getRequestIdentifier(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  const candidate = forwardedFor?.split(",").at(-1)?.trim();
  if (candidate && isIP(candidate)) return candidate;

  return "unknown";
}

/** Atomic, database-backed fixed-window counter shared by all app instances. */
export async function checkRateLimit({
  scope,
  identifier,
  maximum,
  windowSeconds,
}: {
  scope: string;
  identifier: string;
  maximum: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("No se pudo inicializar el límite de solicitudes.");
  }

  const key = createHmac("sha256", secret)
    .update(`${scope}:${identifier}`)
    .digest("hex");
  const now = Date.now();
  const cutoff = now - windowSeconds * 1_000;

  const { db } = await import("@/db");
  const { rateLimit } = await import("@/db/schema");
  const [counter] = await db
    .insert(rateLimit)
    .values({ key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`CASE WHEN ${rateLimit.lastRequest} <= ${cutoff} THEN 1 ELSE ${rateLimit.count} + 1 END`,
        lastRequest: sql`CASE WHEN ${rateLimit.lastRequest} <= ${cutoff} THEN ${now} ELSE ${rateLimit.lastRequest} END`,
      },
    })
    .returning({
      count: rateLimit.count,
      windowStartedAt: rateLimit.lastRequest,
    });

  // Keep identifiers from abandoned windows from accumulating indefinitely.
  if (Math.random() < 0.01) {
    await db
      .delete(rateLimit)
      .where(lt(rateLimit.lastRequest, now - 24 * 60 * 60 * 1_000));
  }

  return evaluateRateLimit({
    count: counter?.count ?? maximum + 1,
    maximum,
    windowStartedAt: counter?.windowStartedAt ?? now,
    windowSeconds,
    now,
  });
}

export async function consumeAuthRateLimit(
  key: string,
  rule: { window: number; max: number },
): Promise<{ allowed: boolean; retryAfter: number | null }> {
  const result = await checkRateLimit({
    scope: "better-auth",
    identifier: key,
    maximum: rule.max,
    windowSeconds: rule.window,
  });

  return {
    allowed: result.allowed,
    retryAfter: result.allowed ? null : result.retryAfterSeconds,
  };
}
