import { Link, useSearch } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  const { redirect } = useSearch({ from: '/(auth)/sign-up' })

  return (
    <AuthLayout>
      <Card className='gap-5 border-white/7 bg-[#111113] text-white shadow-[0_24px_48px_rgba(0,0,0,0.45)]'>
        <CardHeader>
          <CardTitle className='text-2xl tracking-tight text-white'>Create account</CardTitle>
          <CardDescription className='text-sm leading-6 text-[#888]'>
            Start with a personal QuantEdge account, then create or join a firm workspace later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
        </CardContent>
        <CardFooter className='flex flex-col items-start gap-3 text-sm text-[#888]'>
          <p>
            Already have an account?{' '}
            <Link to='/sign-in' search={redirect ? { redirect } : undefined} className='underline underline-offset-4 hover:text-white'>
              Sign in
            </Link>
          </p>
          <p>
            By creating an account, you agree to our{' '}
            <a href='/terms' className='underline underline-offset-4 hover:text-white'>Terms of Service</a>{' '}
            and{' '}
            <a href='/privacy' className='underline underline-offset-4 hover:text-white'>Privacy Policy</a>.
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
