import { z } from "zod";

export const appointmentCalendarQuerySchema = z.object({
  businessId: z.uuid(),
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
  staffId: z.uuid().optional(),
});

export const appointmentCalendarEventSchema = z.object({
  id: z.uuid(),
  start: z.iso.datetime({ offset: true }),
  end: z.iso.datetime({ offset: true }),
  serviceName: z.string(),
  clientName: z.string(),
  professionalName: z.string(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]),
  notes: z.string().nullable(),
});

export const appointmentCalendarEventsSchema = z.array(
  appointmentCalendarEventSchema,
);

export type AppointmentCalendarEvent = z.infer<
  typeof appointmentCalendarEventSchema
>;
