import { z } from 'zod'

export const loginEmailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
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

export type LoginEmailData = z.infer<typeof loginEmailSchema>
export type SignupEmailData = z.infer<typeof signupEmailSchema>
