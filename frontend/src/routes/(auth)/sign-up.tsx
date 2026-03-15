import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { supabase } from '@/lib/supabase/client'
import { SignUp } from '@/features/auth/sign-up'

export const Route = createFileRoute('/(auth)/sign-up')({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  },
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: SignUp,
})
