import { describe, expect, it } from "vitest";

import {
  reportPaymentSchema,
  reviewPaymentSchema,
} from "../../src/features/payments/schemas";

const appointmentId = "98bb78ec-3450-43e5-840e-f7c318a1187b";
const paymentId = "a074c0e1-8856-43af-8b87-97f9a8f1aac9";

describe("reportPaymentSchema", () => {
  it("normalizes a positive integer amount and reference", () => {
    expect(
      reportPaymentSchema.parse({
        appointmentId,
        amountCrc: "5000",
        reference: "  SINPE-12345  ",
      }),
    ).toEqual({
      appointmentId,
      amountCrc: 5000,
      reference: "SINPE-12345",
    });
  });

  it.each(["0", "-1", "1.5", "2147483648", "no es monto"])(
    "rejects an invalid amount: %s",
    (amountCrc) => {
      expect(
        reportPaymentSchema.safeParse({
          appointmentId,
          amountCrc,
          reference: "SINPE-12345",
        }).success,
      ).toBe(false);
    },
  );

  it("rejects references outside the allowed length", () => {
    expect(
      reportPaymentSchema.safeParse({
        appointmentId,
        amountCrc: "5000",
        reference: "  ",
      }).success,
    ).toBe(false);
  });
});

describe("reviewPaymentSchema", () => {
  it("requires a useful reason to reject a payment report", () => {
    expect(
      reviewPaymentSchema.safeParse({
        paymentId,
        status: "rejected",
        reviewNote: "  ",
      }).success,
    ).toBe(false);

    expect(
      reviewPaymentSchema.parse({
        paymentId,
        status: "rejected",
        reviewNote: "La referencia no coincide",
      }).reviewNote,
    ).toBe("La referencia no coincide");
  });

  it("allows verification without a rejection note", () => {
    expect(
      reviewPaymentSchema.parse({ paymentId, status: "verified" }),
    ).toMatchObject({ paymentId, status: "verified" });
  });
});
