import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { ensureUniqueOrgSlug } from '@/lib/supabase/orgs'
import { sendWelcomeEmail } from '@/lib/email/emailApi'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/register')({
  component: RegisterFirmPage,
})

const titleOptions = ['Analyst', 'Associate', 'VP', 'Director', 'MD', 'Partner', 'Other']

function RegisterFirmPage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((state) => state.auth.user)
  const setSession = useAuthStore((state) => state.auth.setSession)
  const setCurrentOrg = useOrgStore((state) => state.setCurrentOrg)
  const setCurrentMembership = useOrgStore((state) => state.setCurrentMembership)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    firmName: 'QuantEdge Finance & IT',
    firmDomain: '',
    yourName: currentUser?.user_metadata?.full_name || '',
    workEmail: currentUser?.email || '',
    password: '',
    title: 'Analyst',
  })

  useEffect(() => {
    if (!currentUser) return
    setFormData((current) => ({
      ...current,
      yourName: current.yourName || currentUser.user_metadata?.full_name || '',
      workEmail: current.workEmail || currentUser.email || '',
    }))
  }, [currentUser])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    let createdOrgId: string | null = null
    let membershipCreated = false

    try {
      const orgId = crypto.randomUUID()
      if (formData.firmDomain && !formData.workEmail.endsWith(`@${formData.firmDomain}`)) {
        toast.error('Work email must match the firm domain')
        setSubmitting(false)
        return
      }

      let activeUser = currentUser

      if (!activeUser) {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.workEmail,
          password: formData.password,
          options: {
            data: {
              full_name: formData.yourName,
              company: formData.firmName,
            },
          },
        })

        if (signUpError) throw signUpError
        if (!authData.user) throw new Error('Auth user was not created')
        activeUser = authData.user

        if (authData.session) {
          setSession(authData.session)
        }
      }

      if (!activeUser) throw new Error('No authenticated user available')

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: activeUser.id,
        full_name: formData.yourName || activeUser.user_metadata?.full_name || activeUser.email?.split('@')[0] || 'QuantEdge User',
        email: formData.workEmail || activeUser.email,
        company: formData.firmName,
        role: 'analyst',
        current_org_id: null,
        is_platform_admin: false,
        avatar_url: typeof activeUser.user_metadata?.avatar_url === 'string' ? activeUser.user_metadata.avatar_url : null,
      } as never)

      if (profileError) throw profileError

      let resolvedOrgId = orgId
      let orgCreated = false
      let slugAttempts = 0

      while (!orgCreated && slugAttempts < 5) {
        slugAttempts += 1
        const slug = await ensureUniqueOrgSlug(
          slugAttempts === 1 ? formData.firmName : `${formData.firmName} ${Date.now()}`
        )

        const candidateOrgId = slugAttempts === 1 ? resolvedOrgId : crypto.randomUUID()
        const { error: orgError } = await supabase
          .from('organizations')
          .insert({
            id: candidateOrgId,
            name: formData.firmName,
            slug,
            domain: formData.firmDomain || null,
            logo_url: null,
            primary_color: '#f97316',
            accent_color: '#06b6d4',
            plan: 'free',
            subscription_status: 'active',
            seat_limit: 5,
            ai_calls_limit: 100,
            ai_calls_used: 0,
            allow_public_deals: false,
            require_2fa: false,
            billing_cycle_start: new Date().toISOString(),
          } as never)

        if (!orgError) {
          resolvedOrgId = candidateOrgId
          createdOrgId = candidateOrgId
          orgCreated = true
          break
        }

        if (!orgError.message?.includes('organizations_slug_key') && orgError.code !== '23505') {
          throw orgError
        }
      }

      if (!orgCreated) {
        throw new Error('A workspace with this slug already exists. Try a slightly different firm name or domain.')
      }

      const membershipPayload = {
        org_id: resolvedOrgId,
        user_id: activeUser.id,
        role: 'owner',
        department: 'Corporate Finance',
        title: formData.title,
        invited_by: activeUser.id,
        is_active: true,
      }

      const { error: memberError } = await supabase
        .from('org_members')
        .insert(membershipPayload as never)

      if (memberError) throw memberError
      membershipCreated = true

      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          current_org_id: resolvedOrgId,
          company: formData.firmName,
        } as never)
        .eq('id', activeUser.id)

      if (updateProfileError) throw updateProfileError

      const { data: createdOrg, error: fetchOrgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', resolvedOrgId)
        .single()

      if (fetchOrgError) throw fetchOrgError

      setCurrentOrg(createdOrg)
      setCurrentMembership(membershipPayload as never)
      if (!currentUser) {
        sendWelcomeEmail(formData.workEmail, formData.yourName.split(' ')[0] || 'Team')
      }
      toast.success(`${formData.firmName} workspace created`)
      void navigate({ to: '/onboarding/firm', search: { orgId: resolvedOrgId } as never })
    } catch (error: any) {
      if (createdOrgId && !membershipCreated) {
        await supabase
          .from('organizations')
          .delete()
          .eq('id', createdOrgId)
      }
      toast.error(error.message || 'Failed to register firm')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='min-h-screen bg-bg-base px-6 py-12 text-text-primary'>
      <div className='mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]'>
        <div className='space-y-6'>
          <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>Firm Registration</p>
          <h1 className='font-display text-5xl tracking-[-0.05em]'>Build your firm workspace.</h1>
          <p className='font-ui text-lg text-text-secondary'>
            Turn QuantEdge into a shared operating system for {formData.firmName || 'your firm'}.
          </p>
          <div className='rounded-2xl border border-border-subtle bg-bg-surface p-6'>
            <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Free plan includes</p>
            <div className='mt-4 grid gap-3 font-ui text-sm text-text-secondary'>
              <p>Up to 5 seats</p>
              <p>100 AI calls per month</p>
              <p>DCF, M&A, and LBO models</p>
              <p>Private workspace for your firm</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='rounded-2xl border border-border-subtle bg-bg-surface p-6'>
          <div className='grid gap-5'>
            <div className='grid gap-2'>
              <Label>Firm Name</Label>
              <Input value={formData.firmName} onChange={(event) => setFormData((current) => ({ ...current, firmName: event.target.value }))} required />
            </div>
            <div className='grid gap-2'>
              <Label>Firm Domain</Label>
              <Input placeholder='quantedge.io' value={formData.firmDomain} onChange={(event) => setFormData((current) => ({ ...current, firmDomain: event.target.value.toLowerCase() }))} />
            </div>
            <div className='grid gap-2'>
              <Label>Your Name</Label>
              <Input value={formData.yourName} onChange={(event) => setFormData((current) => ({ ...current, yourName: event.target.value }))} required />
            </div>
            <div className='grid gap-2'>
              <Label>Your Work Email</Label>
              <Input type='email' value={formData.workEmail} onChange={(event) => setFormData((current) => ({ ...current, workEmail: event.target.value }))} required />
            </div>
            <div className='grid gap-2'>
              <Label>Password</Label>
              <Input type='password' value={formData.password} onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))} required={!currentUser} disabled={!!currentUser} placeholder={currentUser ? 'Signed in as current user' : ''} />
            </div>
            <div className='grid gap-2'>
              <Label>Your Title</Label>
              <select
                value={formData.title}
                onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                className='h-10 rounded-md border border-border-subtle bg-bg-elevated px-3 font-ui text-sm text-text-primary'
              >
                {titleOptions.map((title) => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
            </div>
            <Button type='submit' disabled={submitting}>
              {submitting ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
              Create Firm Workspace
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
