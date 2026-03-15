import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { lookupInvitationByToken, lookupOrganizationByDomain } from '@/lib/supabase/orgs'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { cn } from '@/lib/utils'
import { sendWelcomeEmail } from '@/lib/email/emailApi'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { Checkbox } from '@/components/ui/checkbox'

const formSchema = z
  .object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.email({
      error: (iss) => (iss.input === '' ? 'Please enter your email' : undefined),
    }),
    company: z.string().optional(),
    password: z
      .string()
      .min(1, 'Please enter your password')
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'You must accept the Terms of Service and Privacy Policy',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof formSchema>

function getPasswordStrength(password: string): {
  label: string
  color: string
  width: string
} {
  if (!password) return { label: '', color: '', width: '0%' }
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /\d/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)
  const score = [
    password.length >= 8,
    hasLower,
    hasUpper,
    hasDigit,
    hasSpecial,
  ].filter(Boolean).length

  if (score <= 2) return { label: 'Weak', color: 'bg-destructive', width: '33%' }
  if (score <= 3) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' }
  return { label: 'Strong', color: 'bg-green-500', width: '100%' }
}

export function SignUpForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.auth.user)
  const setCurrentOrg = useOrgStore((state) => state.setCurrentOrg)
  const setCurrentMembership = useOrgStore((state) => state.setCurrentMembership)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [createdEmail, setCreatedEmail] = useState<string | null>(null)
  const [matchedOrgName, setMatchedOrgName] = useState<string | null>(null)
  const [inviteToken, setInviteToken] = useState(() => new URLSearchParams(window.location.search).get('invite') ?? '')

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      email: '',
      company: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  })

  const passwordValue = form.watch('password')
  const strength = getPasswordStrength(passwordValue)

  async function onSubmit(data: FormValues) {
    setIsLoading(true)
    setAuthError(null)

    // 1. Create Supabase auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
        },
      },
    })

    if (signUpError) {
      setAuthError(signUpError.message)
      setIsLoading(false)
      return
    }

    // 2. Insert into public.profiles
    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        full_name: data.full_name,
        email: data.email,
        company: data.company || null,
        role: 'analyst',
      })

      if (profileError) {
        // Not fatal — auth user exists, profile can be created on first login
        console.warn('Profile insert failed:', profileError.message)
      }
    }

    setIsLoading(false)
    toast.success('Account created!')
    sendWelcomeEmail(data.email, data.full_name.split(' ')[0])
    setCreatedEmail(data.email)
    const matchedOrg = await lookupOrganizationByDomain(data.email).catch(() => null)
    setMatchedOrgName(matchedOrg?.name ?? null)
    setSuccess(data.email)
  }

  async function handleJoinFirm() {
    if (!currentUser) {
      toast.error('Sign in after confirming your email to join a firm workspace')
      return
    }

    try {
      let orgId: string | null = null
      let role: 'owner' | 'admin' | 'vp' | 'associate' | 'analyst' | 'viewer' = 'analyst'

      if (inviteToken.trim()) {
        const invitation = await lookupInvitationByToken(inviteToken.trim())
        if (!invitation) throw new Error('Invite token is invalid')
        orgId = invitation.org_id
        role = invitation.role

        const { error: invitationError } = await supabase
          .from('org_invitations')
          .update({ status: 'accepted' } as never)
          .eq('id', invitation.id)

        if (invitationError) throw invitationError
      } else if (createdEmail) {
        const matchedOrg = await lookupOrganizationByDomain(createdEmail)
        if (!matchedOrg) throw new Error('No firm was found for your domain')
        orgId = matchedOrg.id
      }

      if (!orgId) throw new Error('Firm context is missing')

      const { data: membership, error: memberError } = await supabase
        .from('org_members')
        .upsert({
          org_id: orgId,
          user_id: currentUser.id,
          role,
          is_active: true,
        } as never, { onConflict: 'org_id,user_id' })
        .select('*')
        .single()

      if (memberError) throw memberError

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()

      if (orgError) throw orgError

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ current_org_id: orgId } as never)
        .eq('id', currentUser.id)

      if (profileError) throw profileError

      setCurrentOrg(org)
      setCurrentMembership(membership)
      toast.success(`Joined ${org.name}`)
      void navigate({ to: '/dashboard' })
    } catch (error: any) {
      toast.error(error.message || 'Failed to join firm')
    }
  }

  if (success) {
    return (
      <div className='space-y-5 py-2'>
        <div className='flex flex-col items-center gap-4 text-center'>
          <CheckCircle className='h-12 w-12 text-green-500' />
          <div>
            <h3 className='text-lg font-semibold'>Account created</h3>
            <p className='mt-1 text-sm text-muted-foreground'>
              We sent a confirmation link to <strong>{success}</strong>.
              <br />
              Click the link to activate your QuantEdge account.
            </p>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'>
            <p className='font-display text-lg text-foreground'>Join Your Firm</p>
            <p className='mt-2 text-sm text-muted-foreground'>
              {matchedOrgName ? `We found your firm: ${matchedOrgName}.` : 'Enter an invite code or join via your firm domain.'}
            </p>
            <Input
              value={inviteToken}
              onChange={(event) => setInviteToken(event.target.value)}
              placeholder='Invite token (optional)'
              className='mt-4'
            />
            <Button className='mt-4 w-full' onClick={() => void handleJoinFirm()}>
              Join Firm Workspace
            </Button>
          </div>

          <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'>
            <p className='font-display text-lg text-foreground'>Use Personally</p>
            <p className='mt-2 text-sm text-muted-foreground'>
              Continue with a solo workspace and create or join a firm later.
            </p>
            <Button className='mt-4 w-full' variant='outline' onClick={() => void navigate({ to: '/dashboard' })}>
              Continue Solo
            </Button>
            <Button className='mt-3 w-full' variant='ghost' onClick={() => void navigate({ to: '/register' })}>
              Create a Firm Instead
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        {authError && (
          <div className='rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
            {authError}
          </div>
        )}
        <FormField
          control={form.control}
          name='full_name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder='Jane Smith' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder='name@company.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='company'
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Company <span className='text-muted-foreground font-normal'>(optional)</span>
              </FormLabel>
              <FormControl>
                <Input placeholder='Goldman Sachs' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder='Min. 8 characters' {...field} />
              </FormControl>
              {passwordValue && (
                <div className='mt-1 space-y-1'>
                  <div className='h-1.5 w-full rounded bg-muted overflow-hidden'>
                    <div
                      className={cn('h-full rounded transition-all', strength.color)}
                      style={{ width: strength.width }}
                    />
                  </div>
                  <p className='text-xs text-muted-foreground'>{strength.label}</p>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder='Repeat password' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='acceptTerms'
          render={({ field }) => (
            <FormItem className='flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm'>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className='space-y-1 leading-none'>
                <FormLabel className='text-sm text-muted-foreground font-normal leading-snug'>
                  I agree to the{' '}
                  <a href='/terms' className='font-medium text-foreground underline underline-offset-4 hover:text-primary'>
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href='/privacy' className='font-medium text-foreground underline underline-offset-4 hover:text-primary'>
                    Privacy Policy
                  </a>
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <UserPlus />}
          Create Account
        </Button>
      </form>
    </Form>
  )
}
