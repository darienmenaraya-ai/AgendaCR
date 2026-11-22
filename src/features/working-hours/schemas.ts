import { z } from "zod";

const clockTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa una hora válida.");

const dayScheduleSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    isOpen: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
  })
  .superRefine((day, context) => {
    if (!day.isOpen) return;

    const start = clockTime.safeParse(day.startTime);
    const end = clockTime.safeParse(day.endTime);

    if (!start.success) {
      context.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "Indica una hora de apertura válida.",
      });
    }
    if (!end.success) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Indica una hora de cierre válida.",
      });
    }
    if (start.success && end.success && day.startTime >= day.endTime) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "La hora de cierre debe ser posterior a la apertura.",
      });
    }
  });

export const weeklyScheduleSchema = z.object({
  businessId: z.uuid(),
  staffId: z.uuid(),
  days: z.array(dayScheduleSchema).length(7),
});
