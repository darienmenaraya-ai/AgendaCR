import { z } from "zod";

export const createStaffInvitationSchema = z.object({
  businessId: z.uuid(),
  email: z.email("Escribe un correo electrónico válido."),
});

export const revokeStaffInvitationSchema = z.object({
  businessId: z.uuid(),
  invitationId: z.uuid(),
});

export const acceptStaffInvitationSchema = z.object({
  token: z
    .string()
    .min(32)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/),
});

export const updateStaffServiceSchema = z.object({
  businessId: z.uuid(),
  staffId: z.uuid(),
  serviceId: z.uuid(),
  assigned: z.enum(["true", "false"]),
});
