import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SignUp } from '@/features/auth/sign-up'

export const Route = createFileRoute('/(auth)/sign-up')({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: SignUp,
})
