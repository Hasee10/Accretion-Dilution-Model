import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import axios from 'axios'
import {
  Activity,
  ArrowUpRight,
  Building2,
  CreditCard,
  Crown,
  Library,
  Mail,
  Pin,
  RefreshCw,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { PremiumCard } from '@/components/ui/premium-card'
import { FinanceTable, type FinanceColumn } from '@/components/ui/finance-table'
import { apiUrl } from '@/lib/api'
import { supabase } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activity-log'
import { usePermissions } from '@/hooks/use-permissions'
import type { ActivityLogEntry, OrgInvitation, OrgMember, Organization, Profile, SavedDeal } from '@/lib/supabase/types'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { cn } from '@/lib/utils'

type AdminTab = 'overview' | 'members' | 'library' | 'branding' | 'billing'

type OrgMemberWithProfile = OrgMember & {
  profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null
}

type InvitationWithMeta = OrgInvitation & {
  inviterName: string
}

type DealLibraryRow = SavedDeal & {
  creatorName: string
  targetCompany: string
}

const roleOptions = ['owner', 'admin', 'vp', 'associate', 'analyst', 'viewer'] as const

function ProgressBar({ value, limit, tone = 'primary' }: { value: number; limit: number; tone?: 'primary' | 'negative' | 'positive' }) {
  const ratio = limit <= 0 ? 0 : Math.min(100, (value / limit) * 100)
  const color = tone === 'negative' ? 'bg-negative' : tone === 'positive' ? 'bg-positive' : 'bg-accent-primary'

  return (
    <div className='space-y-2'>
      <div className='h-2 overflow-hidden rounded-full bg-bg-overlay'>
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${ratio}%` }} />
      </div>
      <p className='font-ui text-xs text-text-muted'>{limit < 0 ? `${value} used · unlimited` : `${value} / ${limit}`}</p>
    </div>
  )
}

function formatTimeAgo(dateValue: string) {
  const delta = Date.now() - new Date(dateValue).getTime()
  const minutes = Math.floor(delta / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateValue).toLocaleDateString()
}

function normalizeEmails(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]+/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    )
  )
}

function buildActivityText(activity: ActivityLogEntry, userName: string) {
  const metadata = activity.metadata ?? {}
  const resourceName =
    typeof metadata.deal_name === 'string'
      ? metadata.deal_name
      : typeof metadata.model_name === 'string'
        ? metadata.model_name
        : typeof metadata.email === 'string'
          ? metadata.email
          : typeof metadata.org_name === 'string'
            ? metadata.org_name
            : activity.resource_type ?? 'resource'

  switch (activity.action) {
    case 'deal.created':
      return `${userName} saved ${resourceName}`
    case 'deal.shared':
      return `${userName} shared ${resourceName} to the firm library`
    case 'deal.cloned':
      return `${userName} cloned ${resourceName}`
    case 'deal.deleted':
      return `${userName} deleted ${resourceName}`
    case 'deal.visibility.changed':
      return `${userName} updated sharing for ${resourceName}`
    case 'deal.pinned':
      return `${userName} pinned ${resourceName}`
    case 'member.invited':
      return `${userName} invited ${resourceName}`
    case 'member.joined':
      return `${userName} joined the workspace`
    case 'member.removed':
      return `${userName} removed ${resourceName}`
    case 'member.role_changed':
    case 'member.role.changed':
      return `${userName} changed ${resourceName}'s role`
    case 'org.upgraded':
      return `${userName} upgraded the workspace`
    case 'org.branding_updated':
    case 'org.branding.updated':
      return `${userName} updated firm branding`
    case 'ai.call_made':
      return `${userName} used QuantEdge AI`
    default:
      return `${userName} ${activity.action.replaceAll('.', ' ')} ${resourceName}`
  }
}

export default function AdminPage() {
  const navigate = useNavigate()
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const authUser = useAuthStore((state) => state.auth.user)
  const currentOrg = useOrgStore((state) => state.currentOrg)
  const setCurrentOrg = useOrgStore((state) => state.setCurrentOrg)
  const { can, canMin, role } = usePermissions()

  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [members, setMembers] = useState<OrgMemberWithProfile[]>([])
  const [invitations, setInvitations] = useState<InvitationWithMeta[]>([])
  const [libraryDeals, setLibraryDeals] = useState<DealLibraryRow[]>([])
  const [activity, setActivity] = useState<ActivityLogEntry[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [bulkRole, setBulkRole] = useState<'vp' | 'associate' | 'analyst' | 'viewer'>('analyst')
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'vp' | 'associate' | 'analyst' | 'viewer'>('analyst')
  const [brandingForm, setBrandingForm] = useState({
    name: currentOrg?.name ?? 'QuantEdge',
    sidebar_label: currentOrg?.sidebar_label ?? currentOrg?.name ?? 'QuantEdge',
    logo_url: currentOrg?.logo_url ?? '',
    primary_color: currentOrg?.primary_color ?? '#f97316',
    accent_color: currentOrg?.accent_color ?? '#06b6d4',
  })
  const [brandingSaving, setBrandingSaving] = useState(false)
  const [overviewCounts, setOverviewCounts] = useState({ dealsThisMonth: 0, sharedDeals: 0 })

  useEffect(() => {
    setBrandingForm({
      name: currentOrg?.name ?? 'QuantEdge',
      sidebar_label: currentOrg?.sidebar_label ?? currentOrg?.name ?? 'QuantEdge',
      logo_url: currentOrg?.logo_url ?? '',
      primary_color: currentOrg?.primary_color ?? '#f97316',
      accent_color: currentOrg?.accent_color ?? '#06b6d4',
    })
  }, [currentOrg])

  useEffect(() => {
    if (currentOrg && !canMin('admin')) {
      toast.error('403 - Access Denied')
      void navigate({ to: '/dashboard' })
    }
  }, [canMin, currentOrg, navigate])

  useEffect(() => {
    if (!currentOrg?.id || !userId || !canMin('admin')) {
      setLoading(false)
      return
    }
    void loadAdminData()
  }, [currentOrg?.id, userId, canMin])

  useEffect(() => {
    if (!currentOrg?.id || !canMin('admin')) return

    const channel = supabase
      .channel(`org-activity-${currentOrg.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log', filter: `org_id=eq.${currentOrg.id}` },
        () => {
          void loadActivitiesOnly()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [currentOrg?.id, canMin])

  async function loadActivitiesOnly() {
    if (!currentOrg?.id) return
    const activityResponse = await supabase.from('activity_log').select('*').eq('org_id', currentOrg.id).order('created_at', { ascending: false }).limit(20)
    if (!activityResponse.error) {
      setActivity(activityResponse.data ?? [])
    }
  }

  async function loadAdminData() {
    if (!currentOrg?.id) return
    setLoading(true)
    try {
      const [membersResponse, invitesResponse, dealsResponse, activityResponse, dealsThisMonthResponse, sharedDealsResponse] = await Promise.all([
        supabase.from('org_members').select('*').eq('org_id', currentOrg.id).order('joined_at', { ascending: true }),
        supabase.from('org_invitations').select('*').eq('org_id', currentOrg.id).order('created_at', { ascending: false }),
        supabase.from('saved_deals').select('*').eq('org_id', currentOrg.id).in('visibility', ['org', 'public']).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('activity_log').select('*').eq('org_id', currentOrg.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('saved_deals').select('id', { count: 'exact', head: true }).eq('org_id', currentOrg.id).gte('created_at', currentOrg.billing_cycle_start),
        supabase.from('saved_deals').select('id', { count: 'exact', head: true }).eq('org_id', currentOrg.id).in('visibility', ['org', 'public']),
      ])

      if (membersResponse.error) throw membersResponse.error
      if (invitesResponse.error) throw invitesResponse.error
      if (dealsResponse.error) throw dealsResponse.error
      if (activityResponse.error) throw activityResponse.error
      if (dealsThisMonthResponse.error) throw dealsThisMonthResponse.error
      if (sharedDealsResponse.error) throw sharedDealsResponse.error

      const memberRows = membersResponse.data ?? []
      const inviteRows = invitesResponse.data ?? []
      const dealRows = dealsResponse.data ?? []
      const activityRows = activityResponse.data ?? []

      const profileIds = Array.from(new Set([
        ...memberRows.map((member) => member.user_id),
        ...inviteRows.map((invite) => invite.invited_by),
        ...dealRows.map((deal) => deal.created_by).filter(Boolean),
        ...activityRows.map((entry) => entry.user_id).filter(Boolean),
      ].filter(Boolean))) as string[]

      let profilesById = new Map<string, Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>>()
      if (profileIds.length) {
        const profileResponse = await supabase.from('profiles').select('id, full_name, email, avatar_url').in('id', profileIds)
        if (!profileResponse.error) {
          profilesById = new Map((profileResponse.data ?? []).map((profile) => [profile.id, profile]))
        }
      }

      setMembers(memberRows.map((member) => ({ ...member, profile: profilesById.get(member.user_id) ?? null })))
      setInvitations(inviteRows.map((invite) => ({ ...invite, inviterName: profilesById.get(invite.invited_by)?.full_name ?? 'Firm admin' })))
      setLibraryDeals(dealRows.map((deal) => {
        const dealData = (deal.deal_data ?? {}) as Record<string, unknown>
        return {
          ...deal,
          creatorName: deal.created_by ? profilesById.get(deal.created_by)?.full_name ?? 'Team member' : 'Team member',
          targetCompany: String(dealData.targetCompany ?? dealData.name ?? deal.deal_name),
        }
      }))
      setActivity(activityRows)
      setOverviewCounts({ dealsThisMonth: dealsThisMonthResponse.count ?? 0, sharedDeals: sharedDealsResponse.count ?? 0 })
    } catch (error: any) {
      toast.error(error.message || 'Failed to load admin workspace')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function refreshAdminData() {
    setRefreshing(true)
    await loadAdminData()
  }

  async function changeMemberRole(member: OrgMemberWithProfile, nextRole: string) {
    if (!currentOrg?.id || !userId) return
    if (!can('member.role.change')) {
      toast.error('You do not have permission to change member roles')
      return
    }
    if (member.role === 'owner') {
      toast.error('Owner role cannot be changed here')
      return
    }
    if (role !== 'owner' && (member.role === 'admin' || nextRole === 'admin')) {
      toast.error('Only the firm owner can manage admin seats')
      return
    }

    const { error } = await supabase.from('org_members').update({ role: nextRole }).eq('id', member.id)
    if (error) {
      toast.error(error.message || 'Failed to update member role')
      return
    }

    await logActivity({ orgId: currentOrg.id, userId, action: 'member.role_changed', resourceType: 'member', resourceId: member.id, metadata: { email: member.profile?.email ?? member.user_id, role: nextRole } })
    toast.success('Member role updated')
    await loadAdminData()
  }

  async function removeMember(member: OrgMemberWithProfile) {
    if (!currentOrg?.id || !userId) return
    if (!can('member.remove')) {
      toast.error('You do not have permission to remove members')
      return
    }
    if (member.role === 'owner') {
      toast.error('Owner cannot be removed')
      return
    }
    if (!window.confirm(`Remove ${member.profile?.full_name ?? member.profile?.email ?? 'this member'} from the workspace?`)) return

    const { error } = await supabase.from('org_members').delete().eq('id', member.id)
    if (error) {
      toast.error(error.message || 'Failed to remove member')
      return
    }

    await logActivity({ orgId: currentOrg.id, userId, action: 'member.removed', resourceType: 'member', resourceId: member.id, metadata: { email: member.profile?.email ?? member.user_id } })
    toast.success('Member removed')
    await loadAdminData()
  }

  async function bulkChangeRole() {
    if (!selectedMemberIds.length) return
    const rows = members.filter((member) => selectedMemberIds.includes(member.id) && member.role !== 'owner')
    for (const row of rows) {
      await changeMemberRole(row, bulkRole)
    }
    setSelectedMemberIds([])
  }

  async function bulkRemoveMembers() {
    if (!selectedMemberIds.length) return
    const rows = members.filter((member) => selectedMemberIds.includes(member.id) && member.role !== 'owner')
    if (!rows.length) return
    if (!window.confirm(`Remove ${rows.length} selected members?`)) return

    for (const row of rows) {
      await removeMember(row)
    }
    setSelectedMemberIds([])
  }

  async function sendInvites() {
    if (!currentOrg?.id || !userId) return
    if (!can('member.invite')) {
      toast.error('You do not have permission to invite members')
      return
    }

    const emails = normalizeEmails(inviteEmails)
    if (!emails.length) {
      toast.error('Add at least one email address')
      return
    }

    const activeSeatCount = members.filter((member) => member.is_active).length
    const projectedTotal = activeSeatCount + invitations.filter((invite) => invite.status === 'pending').length + emails.length
    if ((currentOrg.seat_limit ?? 5) > 0 && projectedTotal > currentOrg.seat_limit) {
      toast.error('This invite batch would exceed the current seat limit')
      return
    }

    const rows = emails.map((email) => ({ org_id: currentOrg.id, invited_by: userId, email, role: inviteRole, status: 'pending' }))
    const { data, error } = await supabase.from('org_invitations').insert(rows as never).select('*')
    if (error) {
      toast.error(error.message || 'Failed to create invitations')
      return
    }

    const inviterName = authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || 'QuantEdge admin'
    await Promise.allSettled((data ?? []).map((invite) => axios.post(apiUrl('/api/v1/email/firm-invite'), {
      email: invite.email,
      inviterName,
      firmName: currentOrg.name,
      inviteLink: `${window.location.origin}/sign-up?invite=${invite.token}`,
      role: invite.role,
    })))

    await logActivity({ orgId: currentOrg.id, userId, action: 'member.invited', resourceType: 'member', metadata: { email_count: emails.length } })
    toast.success(`Invited ${emails.length} teammate${emails.length > 1 ? 's' : ''}`)
    setInviteEmails('')
    await loadAdminData()
  }

  async function revokeInvitation(invitation: InvitationWithMeta) {
    if (!can('member.invite')) {
      toast.error('You do not have permission to revoke invitations')
      return
    }
    const { error } = await supabase.from('org_invitations').update({ status: 'revoked' }).eq('id', invitation.id)
    if (error) {
      toast.error(error.message || 'Failed to revoke invitation')
      return
    }
    toast.success('Invitation revoked')
    await loadAdminData()
  }

  async function updateDealVisibility(deal: DealLibraryRow, visibility: 'private' | 'org' | 'public') {
    if (!currentOrg?.id || !userId) return
    const permission = visibility === 'public' ? 'deal.share.public' : 'deal.share.org'
    if (visibility !== 'private' && !can(permission)) {
      toast.error('You do not have permission to change visibility to that level')
      return
    }

    const { error } = await supabase.from('saved_deals').update({ visibility, last_edited_by: userId }).eq('id', deal.id)
    if (error) {
      toast.error(error.message || 'Failed to update deal visibility')
      return
    }
    await logActivity({ orgId: currentOrg.id, userId, action: 'deal.shared', resourceType: 'deal', resourceId: deal.id, metadata: { deal_name: deal.deal_name, visibility } })
    toast.success('Deal visibility updated')
    await loadAdminData()
  }

  async function togglePin(deal: DealLibraryRow) {
    if (!currentOrg?.id || !userId) return
    const { error } = await supabase.from('saved_deals').update({ is_pinned: !deal.is_pinned, last_edited_by: userId }).eq('id', deal.id)
    if (error) {
      toast.error(error.message || 'Failed to update pin state')
      return
    }
    await logActivity({ orgId: currentOrg.id, userId, action: 'deal.pinned', resourceType: 'deal', resourceId: deal.id, metadata: { deal_name: deal.deal_name, pinned: !deal.is_pinned } })
    toast.success(deal.is_pinned ? 'Deal unpinned' : 'Deal pinned')
    await loadAdminData()
  }

  async function deleteSharedDeal(deal: DealLibraryRow) {
    if (!currentOrg?.id || !userId) return
    if (!window.confirm(`Delete ${deal.deal_name}?`)) return
    const { error } = await supabase.from('saved_deals').delete().eq('id', deal.id)
    if (error) {
      toast.error(error.message || 'Failed to delete deal')
      return
    }
    await logActivity({ orgId: currentOrg.id, userId, action: 'deal.deleted', resourceType: 'deal', resourceId: deal.id, metadata: { deal_name: deal.deal_name } })
    toast.success('Deal deleted')
    await loadAdminData()
  }

  async function saveBranding() {
    if (!currentOrg?.id || !can('org.branding.edit')) {
      toast.error('You do not have permission to edit branding')
      return
    }
    if (currentOrg.plan === 'free') {
      toast.error('White-label branding unlocks on Pro and Enterprise plans')
      return
    }

    setBrandingSaving(true)
    const payload = {
      name: brandingForm.name,
      sidebar_label: brandingForm.sidebar_label,
      logo_url: brandingForm.logo_url || null,
      primary_color: brandingForm.primary_color,
      accent_color: brandingForm.accent_color,
    }

    const { data, error } = await supabase.from('organizations').update(payload).eq('id', currentOrg.id).select('*').single()
    if (error) {
      setBrandingSaving(false)
      toast.error(error.message || 'Failed to save branding')
      return
    }

    setCurrentOrg(data as Organization)
    await logActivity({ orgId: currentOrg.id, userId, action: 'org.branding_updated', resourceType: 'org', resourceId: currentOrg.id, metadata: { org_name: brandingForm.name } })
    setBrandingSaving(false)
    toast.success('Branding updated')
  }
  async function handleBillingAction() {
    if (!currentOrg?.id || !userId || !authUser?.email) return
    if (currentOrg.plan !== 'free') {
      toast.info('Stripe customer portal wiring is the next billing slice to wire.')
      return
    }
    try {
      const response = await axios.post(apiUrl('/api/v1/stripe/checkout'), {
        org_id: currentOrg.id,
        user_id: userId,
        user_email: authUser.email,
      })
      if (response.data?.url) {
        window.location.assign(response.data.url)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.message || 'Unable to start checkout')
    }
  }

  const userNamesById = useMemo(() => {
    const map = new Map<string, string>()
    for (const member of members) {
      map.set(member.user_id, member.profile?.full_name ?? member.profile?.email ?? 'Team member')
    }
    return map
  }, [members])

  const memberColumns: FinanceColumn<OrgMemberWithProfile>[] = [
    {
      id: 'select',
      key: 'id',
      title: '',
      render: (_value, row) => (
        <Checkbox checked={selectedMemberIds.includes(row.id)} onCheckedChange={(checked) => setSelectedMemberIds((current) => (checked ? [...current, row.id] : current.filter((id) => id !== row.id)))} />
      ),
    },
    {
      key: 'user_id',
      title: 'Member',
      sortable: true,
      render: (_value, row) => (
        <div>
          <p className='font-display text-sm text-text-primary'>{row.profile?.full_name ?? 'Unknown member'}</p>
          <p className='font-ui text-xs text-text-muted'>{row.profile?.email ?? row.user_id}</p>
        </div>
      ),
    },
    { key: 'title', title: 'Title', render: (value) => <span className='font-ui text-sm text-text-secondary'>{String(value ?? 'Analyst')}</span> },
    {
      key: 'role',
      title: 'Role',
      sortable: true,
      render: (value, row) => (
        <select value={String(value)} onChange={(event) => void changeMemberRole(row, event.target.value)} disabled={!can('member.role.change') || row.role === 'owner' || (role !== 'owner' && row.role === 'admin')} className='rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-ui text-sm text-text-primary disabled:opacity-50'>
          {roleOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ),
    },
    { key: 'department', title: 'Department', render: (value) => <span className='font-ui text-sm text-text-secondary'>{String(value ?? '-')}</span> },
    { key: 'joined_at', title: 'Joined', type: 'date', sortable: true },
    { key: 'is_active', title: 'Status', render: (value) => <span className={cn('rounded-full px-2 py-1 font-ui text-[11px] uppercase tracking-[0.12em]', value ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative')}>{value ? 'Active' : 'Inactive'}</span> },
    {
      id: 'actions',
      key: 'id',
      title: 'Actions',
      render: (_value, row) => (
        <Button variant='outline' size='sm' className='border-border-default bg-bg-elevated text-negative' disabled={!can('member.remove') || row.role === 'owner'} onClick={() => void removeMember(row)}>
          Remove
        </Button>
      ),
    },
  ]

  const libraryColumns: FinanceColumn<DealLibraryRow>[] = [
    {
      key: 'deal_name',
      title: 'Deal Name',
      sortable: true,
      render: (value, row) => (
        <div className='flex items-center gap-2'>
          {row.is_pinned ? <Pin className='h-4 w-4 text-accent-amber' /> : null}
          <div>
            <button type='button' className='font-display text-left text-sm text-text-primary hover:text-accent-primary' onClick={() => window.location.assign(`/merger-analysis?dealId=${row.id}`)}>{String(value)}</button>
            <p className='font-ui text-xs text-text-muted'>{row.targetCompany}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'visibility',
      title: 'Visibility',
      sortable: true,
      render: (value, row) => (
        <select value={String(value)} onChange={(event) => void updateDealVisibility(row, event.target.value as 'private' | 'org' | 'public')} className='rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-ui text-sm text-text-primary'>
          <option value='private'>private</option>
          <option value='org'>org</option>
          <option value='public'>public</option>
        </select>
      ),
    },
    { key: 'created_by', title: 'Created By', render: (_value, row) => <span className='font-ui text-sm text-text-secondary'>{row.creatorName}</span> },
    { key: 'created_at', title: 'Saved Date', type: 'date', sortable: true },
    {
      id: 'actions',
      key: 'id',
      title: 'Actions',
      render: (_value, row) => (
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' size='sm' className='border-border-default bg-bg-elevated' onClick={() => void togglePin(row)}>{row.is_pinned ? 'Unpin' : 'Pin'}</Button>
          <Button variant='outline' size='sm' className='border-border-default bg-bg-elevated' onClick={() => void updateDealVisibility(row, 'private')}>Make Private</Button>
          <Button variant='outline' size='sm' className='border-border-default bg-bg-elevated text-negative' onClick={() => void deleteSharedDeal(row)}>Delete</Button>
        </div>
      ),
    },
  ]

  if (!currentOrg || !canMin('admin')) {
    return <div className='min-h-screen bg-bg-base p-8' />
  }

  const totalMembers = members.filter((member) => member.is_active).length
  const aiUsageTone = currentOrg.ai_calls_limit > 0 && currentOrg.ai_calls_used / currentOrg.ai_calls_limit > 0.8 ? 'negative' : 'primary'

  return (
    <div className='min-h-screen bg-bg-base'>
      <div className='space-y-8 p-6 md:p-8'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>QuantEdge / Firm Admin</p>
            <h1 className='font-display text-4xl font-semibold tracking-[-0.03em] text-text-primary'>Firm Administration</h1>
            <p className='mt-2 max-w-3xl font-ui text-sm text-text-secondary'>Operate the {currentOrg.name} workspace: seat controls, shared library governance, branding, and plan usage.</p>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' className='border-border-default bg-bg-elevated' onClick={() => void refreshAdminData()} disabled={refreshing}>
              <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Button className='bg-accent-primary text-white hover:bg-accent-primary/90' onClick={() => setActiveTab('members')}>
              <UserPlus className='mr-2 h-4 w-4' />
              Invite Members
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AdminTab)} className='space-y-6'>
          <TabsList className='bg-bg-elevated'>
            <TabsTrigger value='overview' className='data-[state=active]:bg-bg-surface data-[state=active]:text-text-primary'>Overview</TabsTrigger>
            <TabsTrigger value='members' className='data-[state=active]:bg-bg-surface data-[state=active]:text-text-primary'>Members</TabsTrigger>
            <TabsTrigger value='library' className='data-[state=active]:bg-bg-surface data-[state=active]:text-text-primary'>Firm Library</TabsTrigger>
            <TabsTrigger value='branding' className='data-[state=active]:bg-bg-surface data-[state=active]:text-text-primary'>Branding</TabsTrigger>
            <TabsTrigger value='billing' className='data-[state=active]:bg-bg-surface data-[state=active]:text-text-primary'>Billing</TabsTrigger>
          </TabsList>

          <TabsContent value='overview' className='space-y-6'>
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              <PremiumCard accentColor='primary'><div className='space-y-3'><div className='flex items-center gap-2'><Users className='h-4 w-4 text-accent-primary' /><p className='font-ui text-[10px] uppercase tracking-[0.14em] text-text-muted'>Total Members</p></div><p className='font-mono text-4xl text-text-primary'>{totalMembers} / {currentOrg.seat_limit < 0 ? 'Unlimited' : currentOrg.seat_limit}</p><ProgressBar value={totalMembers} limit={currentOrg.seat_limit} /></div></PremiumCard>
              <PremiumCard accentColor='cyan'><div className='space-y-3'><div className='flex items-center gap-2'><Library className='h-4 w-4 text-accent-cyan' /><p className='font-ui text-[10px] uppercase tracking-[0.14em] text-text-muted'>Deals This Month</p></div><p className='font-mono text-4xl text-text-primary'>{overviewCounts.dealsThisMonth}</p><p className='font-ui text-[13px] text-text-secondary'>New saved deals since the current billing cycle started.</p></div></PremiumCard>
              <PremiumCard accentColor={aiUsageTone === 'negative' ? 'rose' : 'emerald'}><div className='space-y-3'><div className='flex items-center gap-2'><Activity className={cn('h-4 w-4', aiUsageTone === 'negative' ? 'text-negative' : 'text-positive')} /><p className='font-ui text-[10px] uppercase tracking-[0.14em] text-text-muted'>AI Calls Used</p></div><p className='font-mono text-4xl text-text-primary'>{currentOrg.ai_calls_used} / {currentOrg.ai_calls_limit}</p><ProgressBar value={currentOrg.ai_calls_used} limit={currentOrg.ai_calls_limit} tone={aiUsageTone} /></div></PremiumCard>
              <PremiumCard accentColor='violet'><div className='space-y-3'><div className='flex items-center gap-2'><Shield className='h-4 w-4 text-accent-violet' /><p className='font-ui text-[10px] uppercase tracking-[0.14em] text-text-muted'>Shared Deals</p></div><p className='font-mono text-4xl text-text-primary'>{overviewCounts.sharedDeals}</p><p className='font-ui text-[13px] text-text-secondary'>Library entries available across the firm workspace.</p></div></PremiumCard>
            </div>

            <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
              <PremiumCard accentColor='primary'>
                <div className='space-y-5'>
                  <div><p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Workspace Capacity</p><h2 className='mt-2 font-display text-2xl text-text-primary'>Firm plan posture</h2></div>
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'><p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Current Plan</p><p className='mt-3 font-mono text-2xl text-text-primary'>{currentOrg.plan.toUpperCase()}</p></div>
                    <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'><p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Billing Cycle</p><p className='mt-3 font-mono text-2xl text-text-primary'>{new Date(currentOrg.billing_cycle_start).toLocaleDateString()}</p></div>
                    <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'><p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Public Deals</p><p className='mt-3 font-mono text-2xl text-text-primary'>{currentOrg.allow_public_deals ? 'Enabled' : 'Disabled'}</p></div>
                    <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'><p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>2FA Requirement</p><p className='mt-3 font-mono text-2xl text-text-primary'>{currentOrg.require_2fa ? 'Required' : 'Optional'}</p></div>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard accentColor='cyan'>
                <div className='space-y-5'>
                  <div><p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Activity Feed</p><h2 className='mt-2 font-display text-2xl text-text-primary'>Live firm activity</h2></div>
                  <div className='space-y-3'>
                    {activity.slice(0, 20).map((entry) => {
                      const userName = entry.user_id ? userNamesById.get(entry.user_id) ?? 'Team member' : 'System'
                      return <div key={entry.id} className='rounded-xl border border-border-subtle bg-bg-elevated p-4'><div className='flex items-start justify-between gap-3'><div><p className='font-ui text-sm text-text-primary'>{buildActivityText(entry, userName)}</p><p className='mt-1 font-ui text-xs text-text-muted'>{formatTimeAgo(entry.created_at)}</p></div><span className='rounded-full border border-border-subtle px-2 py-1 font-ui text-[10px] uppercase tracking-[0.12em] text-text-secondary'>{entry.resource_type ?? 'activity'}</span></div></div>
                    })}
                    {!activity.length ? <p className='font-ui text-sm text-text-muted'>No recent activity yet.</p> : null}
                  </div>
                </div>
              </PremiumCard>
            </div>
          </TabsContent>

          <TabsContent value='members' className='space-y-6'>
            <PremiumCard accentColor='primary'>
              <div className='grid gap-6 lg:grid-cols-[1.1fr_0.9fr]'>
                <div className='space-y-4'>
                  <div><p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Invite Members</p><h2 className='mt-2 font-display text-2xl text-text-primary'>Batch invite teammates</h2><p className='mt-2 font-ui text-sm text-text-secondary'>Paste one email per line or separate addresses with commas. Invitations are issued with a single role for this batch.</p></div>
                  <Textarea value={inviteEmails} onChange={(event) => setInviteEmails(event.target.value)} placeholder={'analyst@quantedgefi.com\nassociate@quantedgefi.com'} className='min-h-[160px] border-border-subtle bg-bg-elevated font-ui text-text-primary' />
                  <div className='flex flex-wrap items-center gap-3'>
                    <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as typeof inviteRole)} className='rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-ui text-sm text-text-primary'>
                      {roleOptions.filter((option) => option !== 'owner').map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <Button onClick={() => void sendInvites()} disabled={!can('member.invite')}><Mail className='mr-2 h-4 w-4' />Send Invites</Button>
                  </div>
                </div>
                <div className='space-y-4'>
                  <div><p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Bulk Actions</p><h2 className='mt-2 font-display text-2xl text-text-primary'>Manage selected members</h2></div>
                  <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'>
                    <p className='font-ui text-sm text-text-secondary'>{selectedMemberIds.length} selected</p>
                    <div className='mt-4 flex flex-wrap gap-3'>
                      <select value={bulkRole} onChange={(event) => setBulkRole(event.target.value as typeof bulkRole)} className='rounded-md border border-border-subtle bg-bg-surface px-3 py-2 font-ui text-sm text-text-primary'>{(['vp', 'associate', 'analyst', 'viewer'] as const).map((option) => <option key={option} value={option}>{option}</option>)}</select>
                      <Button variant='outline' className='border-border-default bg-bg-surface' disabled={!selectedMemberIds.length} onClick={() => void bulkChangeRole()}>Change Role</Button>
                      <Button variant='outline' className='border-border-default bg-bg-surface text-negative' disabled={!selectedMemberIds.length} onClick={() => void bulkRemoveMembers()}>Remove Selected</Button>
                    </div>
                  </div>
                </div>
              </div>
            </PremiumCard>

            <FinanceTable data={members} columns={memberColumns} loading={loading} emptyMessage='No workspace members yet.' />

            <PremiumCard accentColor='amber'>
              <div className='space-y-4'>
                <div><p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Pending Invitations</p><h2 className='mt-2 font-display text-2xl text-text-primary'>Outstanding invites</h2></div>
                <div className='space-y-3'>
                  {invitations.filter((invite) => invite.status === 'pending').map((invite) => <div key={invite.id} className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-elevated p-4'><div><p className='font-display text-sm text-text-primary'>{invite.email}</p><p className='mt-1 font-ui text-xs text-text-muted'>Role: {invite.role} · Invited by {invite.inviterName} · Expires {formatTimeAgo(invite.expires_at)}</p></div><Button variant='outline' size='sm' className='border-border-default bg-bg-surface text-negative' onClick={() => void revokeInvitation(invite)}>Revoke</Button></div>)}
                  {!invitations.filter((invite) => invite.status === 'pending').length ? <p className='font-ui text-sm text-text-muted'>No pending invitations.</p> : null}
                </div>
              </div>
            </PremiumCard>
          </TabsContent>

          <TabsContent value='library' className='space-y-6'>
            <PremiumCard accentColor='violet'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Firm Library</p>
                  <h2 className='mt-2 font-display text-2xl text-text-primary'>Shared deals across the workspace</h2>
                  <p className='mt-2 font-ui text-sm text-text-secondary'>Pinned deals stay at the top for all members. Admins can reduce visibility or remove stale scenarios.</p>
                </div>
                <div className='rounded-full border border-border-subtle bg-bg-elevated px-3 py-2 font-ui text-xs text-text-secondary'>{libraryDeals.filter((deal) => deal.is_pinned).length} pinned deals</div>
              </div>
            </PremiumCard>
            <FinanceTable data={libraryDeals} columns={libraryColumns} loading={loading} emptyMessage='No shared deals in the firm library yet.' />
          </TabsContent>

          <TabsContent value='branding' className='space-y-6'>
            <div className='grid gap-6 lg:grid-cols-[1fr_0.9fr]'>
              <PremiumCard accentColor='primary'>
                <div className='space-y-5'>
                  <div><p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>White-Label Settings</p><h2 className='mt-2 font-display text-2xl text-text-primary'>Firm branding</h2><p className='mt-2 font-ui text-sm text-text-secondary'>Cloudinary upload is the next backend slice. For now, paste a hosted logo URL and define the live brand colors here.</p></div>
                  {currentOrg.plan === 'free' ? <div className='rounded-xl border border-accent-amber/30 bg-accent-amber/10 p-4 font-ui text-sm text-accent-amber'>Free plan detected. Branding preview is available now; saving firm branding is gated to Pro and Enterprise.</div> : null}
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div className='space-y-2 sm:col-span-2'><label className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Firm Display Name</label><Input value={brandingForm.name} onChange={(event) => setBrandingForm((current) => ({ ...current, name: event.target.value }))} className='border-border-subtle bg-bg-elevated text-text-primary' /></div>
                    <div className='space-y-2 sm:col-span-2'><label className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Custom Sidebar Label</label><Input value={brandingForm.sidebar_label} onChange={(event) => setBrandingForm((current) => ({ ...current, sidebar_label: event.target.value.slice(0, 20) }))} className='border-border-subtle bg-bg-elevated text-text-primary' /></div>
                    <div className='space-y-2 sm:col-span-2'><label className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Logo URL</label><Input value={brandingForm.logo_url} onChange={(event) => setBrandingForm((current) => ({ ...current, logo_url: event.target.value }))} placeholder='https://res.cloudinary.com/.../logo.png' className='border-border-subtle bg-bg-elevated text-text-primary' /></div>
                    <div className='space-y-2'><label className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Primary Color</label><Input type='color' value={brandingForm.primary_color} onChange={(event) => setBrandingForm((current) => ({ ...current, primary_color: event.target.value }))} className='h-11 border-border-subtle bg-bg-elevated p-2' /></div>
                    <div className='space-y-2'><label className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Accent Color</label><Input type='color' value={brandingForm.accent_color} onChange={(event) => setBrandingForm((current) => ({ ...current, accent_color: event.target.value }))} className='h-11 border-border-subtle bg-bg-elevated p-2' /></div>
                  </div>
                  <Button onClick={() => void saveBranding()} disabled={brandingSaving || currentOrg.plan === 'free'}>{brandingSaving ? 'Saving...' : 'Save Branding'}</Button>
                </div>
              </PremiumCard>

              <PremiumCard accentColor='cyan'>
                <div className='space-y-5'>
                  <div><p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Preview Panel</p><h2 className='mt-2 font-display text-2xl text-text-primary'>Live sidebar preview</h2></div>
                  <div className='rounded-2xl border border-border-subtle bg-[#07070a] p-4'>
                    <div className='flex items-center gap-3 border-b border-white/6 pb-4'>
                      <div className='flex h-10 w-10 items-center justify-center rounded-lg border' style={{ borderColor: `${brandingForm.primary_color}55`, backgroundColor: `${brandingForm.primary_color}18` }}>
                        {brandingForm.logo_url ? <img src={brandingForm.logo_url} alt='Firm logo preview' className='h-6 w-6 rounded object-contain' /> : <Building2 className='h-5 w-5' style={{ color: brandingForm.primary_color }} />}
                      </div>
                      <div><p className='font-display text-lg text-text-primary'>{brandingForm.sidebar_label || brandingForm.name}</p><p className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>{currentOrg.plan} workspace</p></div>
                    </div>
                    <div className='mt-4 space-y-2'>
                      {['Dashboard', 'Merger Analysis', 'LBO Quick Model', 'Firm Library', 'Admin Console'].map((item, index) => <div key={item} className='flex items-center justify-between rounded-lg border px-3 py-2' style={{ borderColor: index === 0 ? `${brandingForm.primary_color}55` : 'rgba(255,255,255,0.06)', backgroundColor: index === 0 ? `${brandingForm.primary_color}12` : 'rgba(255,255,255,0.02)' }}><span className='font-ui text-sm text-text-primary'>{item}</span>{index === 0 ? <ArrowUpRight className='h-4 w-4' style={{ color: brandingForm.accent_color }} /> : null}</div>)}
                    </div>
                  </div>
                </div>
              </PremiumCard>
            </div>
          </TabsContent>

          <TabsContent value='billing' className='space-y-6'>
            <PremiumCard accentColor='primary'>
              <div className='space-y-5'>
                <div className='flex flex-wrap items-start justify-between gap-4'>
                  <div><p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Current Plan</p><h2 className='mt-2 font-display text-3xl text-text-primary'>{currentOrg.plan.toUpperCase()} PLAN</h2><p className='mt-2 font-ui text-sm text-text-secondary'>Seats, AI usage, and workspace governance are managed from this panel.</p></div>
                  <Button disabled={!can('org.billing.edit')} onClick={() => void handleBillingAction()}><CreditCard className='mr-2 h-4 w-4' />{currentOrg.plan === 'free' ? 'Upgrade to Pro' : 'Manage Billing'}</Button>
                </div>
                <div className='grid gap-4 md:grid-cols-3'>
                  <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'><p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Seats</p><p className='mt-3 font-mono text-2xl text-text-primary'>{totalMembers} / {currentOrg.seat_limit < 0 ? 'Unlimited' : currentOrg.seat_limit}</p><div className='mt-3'><ProgressBar value={totalMembers} limit={currentOrg.seat_limit} /></div></div>
                  <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'><p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>AI Calls</p><p className='mt-3 font-mono text-2xl text-text-primary'>{currentOrg.ai_calls_used} / {currentOrg.ai_calls_limit}</p><div className='mt-3'><ProgressBar value={currentOrg.ai_calls_used} limit={currentOrg.ai_calls_limit} tone={aiUsageTone} /></div></div>
                  <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'><p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Shared Library</p><p className='mt-3 font-mono text-2xl text-text-primary'>{overviewCounts.sharedDeals}</p><p className='mt-3 font-ui text-sm text-text-secondary'>Shared deal inventory available to the team.</p></div>
                </div>
                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'><div className='flex items-center gap-2'><Crown className='h-4 w-4 text-accent-primary' /><p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Pro unlocks</p></div><ul className='mt-4 space-y-2 font-ui text-sm text-text-secondary'><li>25 seats</li><li>1,000 AI calls per month</li><li>Shared firm library</li><li>White-label branding</li><li>Excel export</li></ul></div>
                  <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'><div className='flex items-center gap-2'><Shield className='h-4 w-4 text-accent-cyan' /><p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Enterprise unlocks</p></div><ul className='mt-4 space-y-2 font-ui text-sm text-text-secondary'><li>Unlimited seats</li><li>Unlimited AI</li><li>SSO / SAML</li><li>Dedicated support</li><li>Custom commercial terms</li></ul></div>
                </div>
              </div>
            </PremiumCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


