/**
 * Form Data Types - inferred from Zod schemas
 */

export interface LoginEmailData {
  email: string
}

export interface LoginPhoneData {
  countryCode: string
  phone: string
}

export interface SignupEmailData {
  firstName: string
  lastName: string
  username: string
  email: string
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
