import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { sendFirmInviteEmail } from '@/lib/email/emailApi'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'

export const Route = createFileRoute('/onboarding/firm')({
  component: FirmOnboardingPage,
})

type InviteDraft = {
  email: string
  role: 'analyst' | 'associate' | 'vp' | 'admin' | 'viewer'
}

function FirmOnboardingPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.auth.user)
  const currentOrg = useOrgStore((state) => state.currentOrg)
  const setCurrentOrg = useOrgStore((state) => state.setCurrentOrg)
  const [submitting, setSubmitting] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#f97316')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InviteDraft['role']>('analyst')
  const [invites, setInvites] = useState<InviteDraft[]>([])
  const orgId = useMemo(() => currentOrg?.id ?? new URLSearchParams(window.location.search).get('orgId'), [currentOrg?.id])

  useEffect(() => {
    if (currentOrg) {
      setLogoUrl(currentOrg.logo_url ?? '')
      setPrimaryColor(currentOrg.primary_color ?? '#f97316')
    }
  }, [currentOrg])

  function addInvite() {
    if (!inviteEmail.trim()) return
    setInvites((current) => [...current, { email: inviteEmail.trim(), role: inviteRole }])
    setInviteEmail('')
    setInviteRole('analyst')
  }

  async function handleSubmit() {
    if (!orgId || !user) {
      toast.error('Organization context is missing')
      return
    }

    setSubmitting(true)
    try {
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .update({
          logo_url: logoUrl || null,
          primary_color: primaryColor,
        } as never)
        .eq('id', orgId)
        .select('*')
        .single()

      if (orgError) throw orgError
      setCurrentOrg(org)

      for (const invite of invites) {
        const { data: invitation, error: inviteError } = await supabase
          .from('org_invitations')
          .insert({
            org_id: orgId,
            invited_by: user.id,
            email: invite.email,
            role: invite.role,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          } as never)
          .select('*')
          .single()

        if (inviteError) throw inviteError

        sendFirmInviteEmail({
          email: invite.email,
          inviterName: user.user_metadata?.full_name || user.email || 'QuantEdge',
          firmName: org.name,
          inviteLink: `${window.location.origin}/sign-up?invite=${invitation.token}`,
          role: invite.role,
        })
      }

      toast.success('Firm setup completed')
      void navigate({ to: '/dashboard' })
    } catch (error: any) {
      toast.error(error.message || 'Failed to finish firm onboarding')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='min-h-screen bg-bg-base px-6 py-12 text-text-primary'>
      <div className='mx-auto max-w-5xl space-y-8'>
        <div>
          <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>Firm Setup</p>
          <h1 className='mt-2 font-display text-5xl tracking-[-0.05em]'>Configure your workspace.</h1>
          <p className='mt-4 max-w-2xl font-ui text-lg text-text-secondary'>
            Add your logo, brand color, and teammates for {currentOrg?.name ?? 'QuantEdge Finance & IT'}.
          </p>
        </div>

        <div className='grid gap-8 lg:grid-cols-[0.9fr_1.1fr]'>
          <div className='rounded-2xl border border-border-subtle bg-bg-surface p-6'>
            <div className='grid gap-5'>
              <div className='grid gap-2'>
                <Label>Firm Logo URL</Label>
                <Input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder='https://res.cloudinary.com/.../logo.png' />
              </div>
              <div className='grid gap-2'>
                <Label>Primary Brand Color</Label>
                <div className='flex items-center gap-3'>
                  <input type='color' value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} className='h-10 w-16 rounded-md border border-border-subtle bg-transparent' />
                  <Input value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
                </div>
              </div>
              <Button variant='outline' className='border-border-default bg-bg-elevated' onClick={() => void navigate({ to: '/dashboard' })}>
                Skip for now
              </Button>
            </div>
          </div>

          <div className='rounded-2xl border border-border-subtle bg-bg-surface p-6'>
            <div className='grid gap-4'>
              <div>
                <p className='font-display text-2xl text-text-primary'>Invite teammates</p>
                <p className='font-ui text-sm text-text-secondary'>Add analysts, associates, and leadership into the same workspace.</p>
              </div>
              <div className='grid gap-3 sm:grid-cols-[1fr_160px_auto]'>
                <Input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder='analyst@firm.com' />
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as InviteDraft['role'])}
                  className='h-10 rounded-md border border-border-subtle bg-bg-elevated px-3 font-ui text-sm text-text-primary'
                >
                  <option value='analyst'>Analyst</option>
                  <option value='associate'>Associate</option>
                  <option value='vp'>VP</option>
                  <option value='admin'>Admin</option>
                  <option value='viewer'>Viewer</option>
                </select>
                <Button type='button' onClick={addInvite}>
                  <Plus className='mr-2 h-4 w-4' />
                  Add
                </Button>
              </div>
              <div className='space-y-3'>
                {invites.length ? invites.map((invite) => (
                  <div key={`${invite.email}-${invite.role}`} className='flex items-center justify-between rounded-xl border border-border-subtle bg-bg-elevated px-4 py-3'>
                    <div>
                      <p className='font-ui text-sm text-text-primary'>{invite.email}</p>
                      <p className='font-ui text-xs uppercase tracking-[0.12em] text-text-muted'>{invite.role}</p>
                    </div>
                    <button type='button' onClick={() => setInvites((current) => current.filter((entry) => entry !== invite))} className='text-text-muted hover:text-text-primary'>
                      <X className='h-4 w-4' />
                    </button>
                  </div>
                )) : <p className='font-ui text-sm text-text-muted'>No invites queued yet.</p>}
              </div>
              <Button onClick={() => void handleSubmit()} disabled={submitting}>
                {submitting ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                Finish Firm Setup
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
