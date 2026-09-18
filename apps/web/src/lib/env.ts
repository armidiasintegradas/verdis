import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const rawKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'demo-publishable-key'

const parsed = envSchema.safeParse({
  VITE_SUPABASE_URL: rawUrl,
  VITE_SUPABASE_PUBLISHABLE_KEY: rawKey,
})

if (!parsed.success) {
  throw new Error(
    'Verdis web environment is invalid. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  )
}

export const env = parsed.data

