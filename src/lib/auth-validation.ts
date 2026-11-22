import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Escribe un correo electrónico válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres.")
    .max(128, "La contraseña no puede superar 128 caracteres."),
});

export const signUpSchema = signInSchema.extend({
  name: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre (al menos 2 caracteres).")
    .max(80, "El nombre no puede superar 80 caracteres."),
});
