import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase/client'
import { SignIn } from '@/features/auth/sign-in'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SignIn,
  validateSearch: searchSchema,
})
