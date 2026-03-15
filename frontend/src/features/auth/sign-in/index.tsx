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
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <Card className='gap-5 border-white/7 bg-[#111113] text-white shadow-[0_24px_48px_rgba(0,0,0,0.45)]'>
        <CardHeader>
          <CardTitle className='text-2xl tracking-tight text-white'>Sign in</CardTitle>
          <CardDescription className='text-sm leading-6 text-[#888]'>
            Access your QuantEdge workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter className='flex flex-col items-start gap-3 text-sm text-[#888]'>
          <p>
            New to QuantEdge?{' '}
            <Link to='/sign-up' search={redirect ? { redirect } : undefined} className='underline underline-offset-4 hover:text-white'>
              Create an account
            </Link>
          </p>
          <p>
            By signing in, you agree to our{' '}
            <a href='/terms' className='underline underline-offset-4 hover:text-white'>Terms of Service</a>{' '}
            and{' '}
            <a href='/privacy' className='underline underline-offset-4 hover:text-white'>Privacy Policy</a>.
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
