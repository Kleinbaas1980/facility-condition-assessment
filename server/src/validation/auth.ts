import { z } from "zod";
export const password = z
  .string()
  .min(12)
  .max(128)
  .refine(
    (value) =>
      /[a-z]/.test(value) &&
      /[A-Z]/.test(value) &&
      /[0-9]/.test(value) &&
      /[^A-Za-z0-9]/.test(value),
    "Use lower-case and capital letters, a number and a special character.",
  );
const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
export const registerSchema = z
  .object({ name: z.string().trim().min(1).max(160), email, password })
  .strict();
export const loginSchema = z
  .object({ email, password: z.string().min(1).max(128) })
  .strict();
export const emailSchema = z.object({ email }).strict();
export const tokenSchema = z
  .object({ token: z.string().min(32).max(128) })
  .strict();
export const resetSchema = tokenSchema.extend({ password }).strict();
export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1).max(128), password })
  .strict();
export const profileSchema = z
  .object({ name: z.string().trim().min(1).max(160) })
  .strict();
