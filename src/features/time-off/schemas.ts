import { z } from "zod";

const timeValue = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Indica una hora válida.");

export const createTimeOffSchema = z.object({
  businessId: z.uuid(),
  staffId: z.uuid(),
  startDate: z.iso.date(),
  startTime: timeValue,
  endDate: z.iso.date(),
  endTime: timeValue,
  reason: z
    .string()
    .trim()
    .max(200, "La descripción no puede superar 200 caracteres.")
    .optional()
    .transform((value) => value || null),
});

export const deleteTimeOffSchema = z.object({
  businessId: z.uuid(),
  staffId: z.uuid(),
  timeOffId: z.uuid(),
});
