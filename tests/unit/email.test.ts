import { afterEach, describe, expect, it, vi } from "vitest";

import { sendAppointmentRequestNotifications } from "../../src/lib/email";

const appointmentRequest = {
  appointmentId: "98bb78ec-3450-43e5-840e-f7c318a1187b",
  businessName: "Barbería <Central>",
  businessOwnerEmail: "owner@example.com",
  clientName: "<script>alert('x')</script>",
  clientEmail: "client@example.com",
  professionalName: "María",
  serviceName: "Corte clásico",
  startsAt: new Date("2026-12-01T16:30:00.000Z"),
  timeZone: "America/Costa_Rica",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendAppointmentRequestNotifications", () => {
  it("sends separate, escaped messages with idempotency keys", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM_EMAIL", "AgendaCR <citas@example.com>");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ id: "email-id" })));
    vi.stubGlobal("fetch", fetchMock);

    await sendAppointmentRequestNotifications(appointmentRequest);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const clientCall = fetchMock.mock.calls[0];
    expect(clientCall).toBeDefined();
    const requestInit = clientCall?.[1];
    expect(requestInit?.headers).toMatchObject({
      Authorization: "Bearer re_test_key",
      "Idempotency-Key": `appointment/${appointmentRequest.appointmentId}/request/client`,
    });
    const body = JSON.parse(String(requestInit?.body)) as {
      to: string[];
      html: string;
      text: string;
    };
    expect(body.to).toEqual([appointmentRequest.clientEmail]);
    expect(body.html).toContain(
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;",
    );
    expect(body.html).not.toContain("<script>");
    expect(body.text).toContain("Fecha y hora:");
  });

  it("skips delivery when Resend is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendAppointmentRequestNotifications(appointmentRequest),
    ).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps booking notifications from failing the reservation action", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("RESEND_FROM_EMAIL", "AgendaCR <citas@example.com>");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("provider unavailable"));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      sendAppointmentRequestNotifications(appointmentRequest),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
