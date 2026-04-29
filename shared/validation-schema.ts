import { z } from 'zod';

export const UserRoleSchema = z.enum(['ADMIN', 'USER', 'GUEST']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const AuthLoginSchema = z.object({
  email: z.string().email({ message: "Ungültige E-Mail-Adresse" }),
  password: z.string().min(8, { message: "Passwort muss mindestens 8 Zeichen lang sein" }),
  rememberMe: z.boolean().optional().default(false)
});

export type AuthLoginDTO = z.infer<typeof AuthLoginSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(30),
  email: z.string().email(),
  role: UserRoleSchema,
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().max(160).optional(),
  lastLogin: z.date().or(z.string().datetime()).optional(),
  createdAt: z.date().or(z.string().datetime()),
  updatedAt: z.date().or(z.string().datetime())
});

export type UserProfileDTO = z.infer<typeof UserProfileSchema>;

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000),
  price: z.number().positive(),
  currency: z.string().length(3).default('EUR'),
  stock: z.number().int().nonnegative(),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.any()).optional()
});

export type ProductDTO = z.infer<typeof ProductSchema>;

export const CreateProductSchema = ProductSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type CreateProductDTO = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();

export type UpdateProductDTO = z.infer<typeof UpdateProductSchema>;

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => 
  z.object({
    success: z.boolean(),
    data: dataSchema.nullable(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional()
    }).nullable(),
    timestamp: z.string().datetime()
  });

export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  timestamp: string;
};