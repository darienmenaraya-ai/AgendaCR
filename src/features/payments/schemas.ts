import { z } from "zod";

export const reportPaymentSchema = z.object({
  appointmentId: z.uuid(),
  amountCrc: z.coerce
    .number()
    .int("El monto debe ser un número entero de colones.")
    .min(1, "El monto debe ser mayor que cero.")
    .max(2_147_483_647, "El monto supera el máximo permitido."),
  reference: z
    .string()
    .trim()
    .min(3, "La referencia debe tener al menos 3 caracteres.")
    .max(100, "La referencia no puede superar 100 caracteres."),
});

const paymentIdSchema = z.object({ paymentId: z.uuid() });

export const reviewPaymentSchema = z.discriminatedUnion("status", [
  paymentIdSchema.extend({
    status: z.literal("verified"),
    reviewNote: z.string().optional(),
  }),
  paymentIdSchema.extend({
    status: z.literal("rejected"),
    reviewNote: z
      .string()
      .trim()
      .min(3, "Explica brevemente qué debe corregir el cliente.")
      .max(300, "El motivo no puede superar 300 caracteres."),
  }),
]);
