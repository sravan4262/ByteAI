/**
 * Form Data Types - inferred from Zod schemas
 *
 * Note: LoginEmailData and SignupEmailData are owned by lib/validation/schemas.ts (Zod-derived)
 * and intentionally not duplicated here. Doing so previously caused TS2308 ambiguous-export
 * errors at lib/index.ts.
 */

export interface LoginPhoneData {
  countryCode: string
  phone: string
}

export interface SignupPhoneData {
  firstName: string
  lastName: string
  username: string
  countryCode: string
  phone: string
}

export interface CreateByteData {
  title: string
  content: string
  tags: string[]
}

export interface UpdateProfileData {
  displayName: string
  bio: string
  techStack: string[]
  links: Array<{ type: string; url: string; label: string }>
}
