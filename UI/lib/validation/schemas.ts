import { z } from 'zod'

export const loginEmailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
})

export const loginPhoneSchema = z.object({
  countryCode: z.string().regex(/^\+\d{1,3}$/, 'e.g. +1'),
  phone: z.string().min(7, 'Too short').max(15, 'Too long').regex(/^\d+$/, 'Digits only'),
})

export const signupEmailSchema = z.object({
  firstName: z.string().min(1, 'Required').max(50),
  lastName: z.string().min(1, 'Required').max(50),
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'Max 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, and _ only'),
  email: z.string().min(1, 'Required').email('Enter a valid email address'),
})

export const signupPhoneSchema = z.object({
  firstName: z.string().min(1, 'Required').max(50),
  lastName: z.string().min(1, 'Required').max(50),
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, and _ only'),
  countryCode: z.string().regex(/^\+\d{1,3}$/, 'e.g. +1'),
  phone: z.string().min(7, 'Too short').max(15, 'Too long').regex(/^\d+$/, 'Digits only'),
})

export type LoginEmailData = z.infer<typeof loginEmailSchema>
export type LoginPhoneData = z.infer<typeof loginPhoneSchema>
export type SignupEmailData = z.infer<typeof signupEmailSchema>
export type SignupPhoneData = z.infer<typeof signupPhoneSchema>
