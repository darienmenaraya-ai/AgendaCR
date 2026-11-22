import { z } from "zod";

export const serviceFormSchema = z.object({
  businessId: z.uuid("El negocio indicado no es válido."),
  serviceId: z.union([z.uuid(), z.literal("")]).optional(),
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(100, "El nombre no puede superar 100 caracteres."),
  durationMinutes: z.coerce
    .number()
    .int("La duración debe indicarse en minutos enteros.")
    .min(5, "La duración mínima es de 5 minutos.")
    .max(480, "La duración máxima es de 8 horas."),
  priceCrc: z.coerce
    .number()
    .int("El precio debe expresarse en colones enteros.")
    .min(0, "El precio no puede ser negativo.")
    .max(10_000_000, "El precio supera el máximo permitido."),
});

export const serviceStatusSchema = z.object({
  businessId: z.uuid(),
  serviceId: z.uuid(),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});
