import { describe, expect, it } from "vitest";

import { hasValidCronAuthorization } from "../../src/lib/cron-auth";

describe("hasValidCronAuthorization", () => {
  it("accepts the configured bearer token", () => {
    const request = new Request("https://example.com/api/cron", {
      headers: { authorization: "Bearer test-secret" },
    });

    expect(hasValidCronAuthorization(request, "test-secret")).toBe(true);
  });

  it("rejects missing or incorrect credentials", () => {
    const missingHeader = new Request("https://example.com/api/cron");
    const incorrectHeader = new Request("https://example.com/api/cron", {
      headers: { authorization: "Bearer wrong-secret" },
    });

    expect(hasValidCronAuthorization(missingHeader, "test-secret")).toBe(false);
    expect(hasValidCronAuthorization(incorrectHeader, "test-secret")).toBe(
      false,
    );
    expect(hasValidCronAuthorization(incorrectHeader, undefined)).toBe(false);
  });
});
