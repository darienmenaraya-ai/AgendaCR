import { z } from "zod";

export const createAppointmentSchema = z.object({
  businessId: z.uuid(),
  serviceId: z.uuid(),
  staffId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
  notes: z
    .string()
    .trim()
    .max(500, "La nota no puede superar 500 caracteres.")
    .optional()
    .transform((value) => value || null),
});

export const updateAppointmentStatusSchema = z.object({
  appointmentId: z.uuid(),
  status: z.enum(["confirmed", "cancelled", "completed", "no_show"]),
});

export const cancelMyAppointmentSchema = z.object({
  appointmentId: z.uuid(),
});
