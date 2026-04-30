import { z } from 'zod';

export const UserRoleSchema = z.enum(['ADMIN', 'USER', 'GUEST']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email({ message: "Ungültige E-Mail-Adresse" }),
  name: z.string().min(2, { message: "Name muss mindestens 2 Zeichen lang sein" }).max(100),
  role: UserRoleSchema.default('USER'),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});
export type User = z.infer<typeof UserSchema>;

export const LoginPayloadSchema = z.object({
  email: z.string().email({ message: "Ungültige E-Mail-Adresse" }),
  password: z.string().min(8, { message: "Passwort muss mindestens 8 Zeichen lang sein" }),
});
export type LoginPayload = z.infer<typeof LoginPayloadSchema>;

export const RegisterPayloadSchema = z.object({
  email: z.string().email({ message: "Ungültige E-Mail-Adresse" }),
  password: z.string().min(8, { message: "Passwort muss mindestens 8 Zeichen lang sein" }),
  confirmPassword: z.string().min(8),
  name: z.string().min(2, { message: "Name muss mindestens 2 Zeichen lang sein" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwörter stimmen nicht überein",
  path: ["confirmPassword"],
});
export type RegisterPayload = z.infer<typeof RegisterPayloadSchema>;

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(8).optional(),
  newPassword: z.string().min(8).optional(),
});
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;

export const PaginationSchema = z.object({
  page: z.preprocess((val) => Number(val) || 1, z.number().int().positive().default(1)),
  limit: z.preprocess((val) => Number(val) || 10, z.number().int().positive().max(100).default(10)),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});
export type PaginationQuery = z.infer<typeof PaginationSchema>;

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ApiErrorSchema.optional(),
    timestamp: z.string().datetime().default(() => new Date().toISOString()),
  });

export const IdParamSchema = z.object({
  id: z.string().uuid({ message: "Ungültige UUID" }),
});
export type IdParam = z.infer<typeof IdParamSchema>;