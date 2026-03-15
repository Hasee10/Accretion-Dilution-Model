import { useEffect, useState } from 'react'
import { Building2, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { FinanceTable, type FinanceColumn } from '@/components/ui/finance-table'
import { MetricCard } from '@/components/ui/metric-card'
import { PremiumCard } from '@/components/ui/premium-card'
import { supabase } from '@/lib/supabase/client'
import type { OrgInvitation, OrgMember, Profile } from '@/lib/supabase/types'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'

type DirectoryRow = {
  id: string
  name: string
  email: string
  role: string
  title: string
  department: string
  status: string
  joined: string
}

export function Users() {
  const user = useAuthStore((state) => state.auth.user)
  const currentOrg = useOrgStore((state) => state.currentOrg)
  const [rows, setRows] = useState<DirectoryRow[]>([])
  const [invites, setInvites] = useState<OrgInvitation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    void loadDirectory()
  }, [user?.id, currentOrg?.id])

  async function loadDirectory() {
    if (!user?.id) return
    setLoading(true)
    try {
      if (!currentOrg?.id) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
        const profile = data as Profile | null
        setRows(
          profile
            ? [
                {
                  id: profile.id,
                  name: profile.full_name,
                  email: profile.email,
                  role: 'owner',
                  title: 'Personal Workspace',
                  department: 'Independent',
                  status: 'active',
                  joined: profile.created_at,
                },
              ]
            : []
        )
        setInvites([])
        return
      }

      const membersResp = await supabase.from('org_members').select('*').eq('org_id', currentOrg.id).order('joined_at', { ascending: true })
      const members = (membersResp.data ?? []) as OrgMember[]
      const profileIds = Array.from(new Set(members.map((member) => member.user_id)))
      const profilesResp = profileIds.length ? await supabase.from('profiles').select('*').in('id', profileIds) : { data: [] }
      const profiles = new Map(((profilesResp.data ?? []) as Profile[]).map((profile) => [profile.id, profile]))

      setRows(
        members.map((member) => {
          const profile = profiles.get(member.user_id)
          return {
            id: member.id,
            name: profile?.full_name ?? 'Team Member',
            email: profile?.email ?? 'Unknown',
            role: member.role,
            title: member.title ?? 'Unassigned',
            department: member.department ?? 'General',
            status: member.is_active ? 'active' : 'inactive',
            joined: member.joined_at,
          }
        })
      )

      const invitesResp = await supabase.from('org_invitations').select('*').eq('org_id', currentOrg.id).eq('status', 'pending').order('created_at', { ascending: false })
      setInvites((invitesResp.data ?? []) as OrgInvitation[])
    } finally {
      setLoading(false)
    }
  }

  const columns: FinanceColumn<DirectoryRow>[] = [
    {
      key: 'name',
      title: 'Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <p className='font-ui text-sm text-text-primary'>{String(value)}</p>
          <p className='font-ui text-xs text-text-muted'>{row.email}</p>
        </div>
      ),
    },
    { key: 'title', title: 'Title', sortable: true },
    { key: 'department', title: 'Department', sortable: true },
    {
      key: 'role',
      title: 'Role',
      sortable: true,
      render: (value) => (
        <span className='rounded-full border border-accent-primary/30 bg-accent-primary/10 px-2 py-1 font-ui text-[10px] uppercase tracking-[0.12em] text-accent-primary'>
          {String(value)}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      sortable: true,
      render: (value) => (
        <span
          className={`rounded-full border px-2 py-1 font-ui text-[10px] uppercase tracking-[0.12em] ${
            value === 'active' ? 'border-positive/30 bg-positive/10 text-positive' : 'border-border-subtle bg-bg-elevated text-text-secondary'
          }`}
        >
          {String(value)}
        </span>
      ),
    },
    { key: 'joined', title: 'Joined', sortable: true, type: 'date' },
  ]

  const activeMembers = rows.filter((row) => row.status === 'active').length
  const leadershipCount = rows.filter((row) => ['owner', 'admin', 'vp'].includes(row.role)).length

  const introTitle = currentOrg ? currentOrg.name : 'Personal Workspace'
  const introSubtitle = currentOrg
    ? 'See the active operating team behind your shared models and invitations.'
    : 'You are currently operating in a solo workspace. Create a firm workspace to unlock shared members and invitations.'

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>Execution / Team Directory</p>
            <h1 className='font-display text-4xl tracking-[-0.04em] text-text-primary'>{introTitle}</h1>
            <p className='mt-2 max-w-3xl font-ui text-sm text-text-secondary'>{introSubtitle}</p>
          </div>
          {currentOrg ? (
            <Button onClick={() => window.location.assign('/admin?tab=members')}>Manage Members</Button>
          ) : (
            <Button onClick={() => window.location.assign('/register')}>Create Firm Workspace</Button>
          )}
        </div>

        <div className='grid gap-4 md:grid-cols-3'>
          <MetricCard label='Active Members' value={activeMembers} valueType='number' accentColor='cyan' secondaryInfo={currentOrg ? `Seat limit ${currentOrg.seat_limit}` : 'Solo mode'} />
          <MetricCard label='Leadership Seats' value={leadershipCount} valueType='number' accentColor='violet' secondaryInfo='Owner, admin, and VP coverage' />
          <MetricCard label='Pending Invites' value={invites.length} valueType='number' accentColor='amber' secondaryInfo='Outstanding join requests' />
        </div>

        <FinanceTable data={rows} columns={columns} loading={loading} emptyMessage='No members found for this workspace yet.' />

        <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
          <PremiumCard accentColor='emerald'>
            <div className='space-y-4'>
              <div className='flex items-center gap-2'>
                <UserRound className='h-4 w-4 text-accent-emerald' />
                <div>
                  <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Invitation Queue</p>
                  <h2 className='mt-1 font-display text-2xl text-text-primary'>Pending teammates</h2>
                </div>
              </div>
              {invites.length ? (
                invites.map((invite) => (
                  <div key={invite.id} className='rounded-xl border border-border-subtle bg-bg-elevated p-4'>
                    <div className='flex items-start justify-between gap-4'>
                      <div>
                        <p className='font-ui text-sm text-text-primary'>{invite.email}</p>
                        <p className='mt-1 font-ui text-xs text-text-secondary'>Role: {invite.role} · Expires {new Date(invite.expires_at).toLocaleDateString()}</p>
                      </div>
                      <Button variant='outline' size='sm' onClick={() => window.location.assign('/admin?tab=members')}>Review</Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className='font-ui text-sm text-text-secondary'>No pending invitations. Your team roster is fully caught up.</p>
              )}
            </div>
          </PremiumCard>

          <PremiumCard accentColor='primary'>
            <div className='space-y-4'>
              <div className='flex items-center gap-2'>
                <ShieldCheck className='h-4 w-4 text-accent-primary' />
                <div>
                  <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Workspace Posture</p>
                  <h2 className='mt-1 font-display text-2xl text-text-primary'>Collaboration health</h2>
                </div>
              </div>
              <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'>
                <div className='flex items-center gap-2'>
                  <Building2 className='h-4 w-4 text-accent-cyan' />
                  <p className='font-ui text-xs text-text-secondary'>{currentOrg ? 'Firm workspace is active' : 'Personal workspace only'}</p>
                </div>
                <p className='mt-3 font-ui text-sm text-text-primary'>
                  {currentOrg
                    ? 'Your directory is now connected to real org membership, pending invitations, and admin controls.'
                    : 'Create a firm workspace to add teammates, roles, and shared visibility across deals and models.'}
                </p>
              </div>
              {user?.email ? (
                <a href={`mailto:${user.email}`} className='inline-flex items-center gap-2 font-ui text-sm text-accent-primary'>
                  <Mail className='h-4 w-4' />
                  Email yourself the current workspace summary
                </a>
              ) : null}
            </div>
          </PremiumCard>
        </div>
      </Main>
    </>
  )
}
