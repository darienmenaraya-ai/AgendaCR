import { describe, expect, it } from "vitest";

import {
  evaluateRateLimit,
  getRequestIdentifier,
} from "../../src/lib/rate-limit";

describe("rate limit decisions", () => {
  it("allows requests up to the configured maximum", () => {
    expect(
      evaluateRateLimit({
        count: 5,
        maximum: 5,
        windowStartedAt: 1_000,
        windowSeconds: 60,
        now: 2_000,
      }).allowed,
    ).toBe(true);
  });

  it("blocks the next request and reports the remaining window", () => {
    expect(
      evaluateRateLimit({
        count: 6,
        maximum: 5,
        windowStartedAt: 1_000,
        windowSeconds: 60,
        now: 2_501,
      }),
    ).toEqual({ allowed: false, retryAfterSeconds: 59 });
  });

  it("allows a new request when the configured window has expired", () => {
    expect(
      evaluateRateLimit({
        count: 6,
        maximum: 5,
        windowStartedAt: 1_000,
        windowSeconds: 60,
        now: 61_000,
      }),
    ).toEqual({ allowed: true, retryAfterSeconds: 1 });
  });
});

describe("getRequestIdentifier", () => {
  it("uses the last validated address in the trusted proxy chain", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.4, 203.0.113.8",
    });
    expect(getRequestIdentifier(headers)).toBe("203.0.113.8");
  });

  it("falls back safely when no valid address is present", () => {
    expect(
      getRequestIdentifier(
        new Headers({
          "x-forwarded-for": "forged",
          "x-real-ip": "198.51.100.4",
        }),
      ),
    ).toBe("unknown");
  });
});
