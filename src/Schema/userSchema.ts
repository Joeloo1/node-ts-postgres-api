import { z } from "zod";
import { UserRole } from "@prisma/client";

export const signupSchema = z.object({
    name: z.string()
            .min(2, { message: 'Name must be at least 2 characters long'})
            .trim(),
    email: z.string()
            .email({ message: 'Invalid email address'})
            .trim()
            .toLowerCase(),
    password: z.string()
                .min(8, { message: 'Password must be at least 8 characters long'})
                .trim(),
    passwordConfirm: z.string(),
    roles: z.enum(['USER', 'ADMIN'])
            .default('USER'),
    phoneNumber: z.string()
                .min(10, { message: 'Phone number must be at least 11 characterslong'})
                .max(15, { message: 'Phone number must be at least 15 characters long'})
                .optional()
                .transform((val) => val ? val.trim() : val),
     profileImage: z.string()
                .url({ message: 'Invalid URL format for profile image'})
                .optional()
}).refine((data) => data.password === data.passwordConfirm, {
        message: "Passwords do not match",
        path: ["passwordConfirm"],
});

// login schema 
export const  loginSchema = z.object({
  email: z.string()
          .email({ message: 'Invalid email address'})
          .trim(),
  password: z.string()
             .min(8, { message: 'Password must be at least 8 characters long'})
             .trim()
})

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
})
