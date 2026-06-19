import { z } from "zod";
import { UserRole } from "@prisma/client";

export const signupSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Name must be at least 2 characters long" })
      .trim(),
    email: z
      .string()
      .email({ message: "Invalid email address" })
      .trim()
      .toLowerCase(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
      .trim(),
    passwordConfirm: z.string(),
    phoneNumber: z
      .string()
      .min(10, { message: "Phone number must be at least 10 characters long" })
      .max(14, { message: "Phone number must be at most 14 characters long" })
      .optional()
      .transform((val) => (val ? val.trim() : val)),
    profileImage: z
      .string()
      .url({ message: "Invalid URL format for profile image" })
      .optional(),
    referredByCode: z
      .string()
      .max(20)
      .optional()
      .transform((v) => v?.toUpperCase().trim() || undefined),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  });

// login schema
export const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }).trim(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .trim(),
});

// update user schema

export const updateUserSchema = z.object({
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  roles: z.enum([UserRole.USER, UserRole.ADMIN]).optional(),
});
