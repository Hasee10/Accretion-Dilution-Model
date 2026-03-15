import { useEffect, useState } from 'react'
import { Building2, CreditCard, FolderKanban, Users2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { MetricCard } from '@/components/ui/metric-card'
import { PremiumCard } from '@/components/ui/premium-card'
import { Button } from '@/components/ui/button'
import { NewsTeaser } from '@/components/news/news-teaser'
import { useOrgStore } from '@/stores/org-store'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'

export function Dashboard() {
  const currentOrg = useOrgStore((state) => state.currentOrg)
  const membership = useOrgStore((state) => state.currentMembership)
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const [memberCount, setMemberCount] = useState(0)
  const [dealCount, setDealCount] = useState(0)
  const [modelCount, setModelCount] = useState(0)

  useEffect(() => {
    if (!currentOrg?.id || !userId) return
    void loadMetrics()
  }, [currentOrg?.id, userId])

  async function loadMetrics() {
    if (!currentOrg?.id) return
    const [members, deals, models] = await Promise.all([
      supabase.from('org_members').select('id', { count: 'exact', head: true }).eq('org_id', currentOrg.id),
      supabase.from('saved_deals').select('id', { count: 'exact', head: true }).eq('org_id', currentOrg.id),
      supabase.from('dcf_models').select('id', { count: 'exact', head: true }).eq('org_id', currentOrg.id),
    ])
    setMemberCount(members.count ?? 0)
    setDealCount(deals.count ?? 0)
    setModelCount(models.count ?? 0)
  }

  return (
    <>
      <Header>
        <TopNav
          links={[
            { title: 'Dashboard', href: '/dashboard', isActive: true, disabled: false },
            {
              title: 'Workspace',
              href: currentOrg ? '/admin' : '/register',
              isActive: false,
              disabled: false,
            },
            { title: 'Billing', href: currentOrg ? '/admin' : '/register', isActive: false, disabled: false },
          ]}
        />
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='space-y-8'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
              <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>Workspace</p>
              <h1 className='font-display text-4xl tracking-[-0.04em] text-text-primary'>
                {currentOrg?.name ?? 'QuantEdge'}
              </h1>
              <p className='mt-2 font-ui text-sm text-text-secondary'>
                {membership ? `${membership.role} workspace member` : 'Firm workspace control center'}
              </p>
            </div>
            <div className='flex gap-3'>
              <Button variant='outline'>Invite Team</Button>
              <Button>Upgrade Plan</Button>
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            <PremiumCard accentColor='primary'>
              <div className='space-y-3'>
                <p className='font-ui text-[10px] uppercase tracking-[0.14em] text-text-muted'>Firm Plan</p>
                <p className='font-mono text-4xl text-text-primary'>{(currentOrg?.plan ?? 'free').toUpperCase()}</p>
                <p className='font-ui text-[13px] text-text-secondary'>Current subscription tier</p>
              </div>
            </PremiumCard>
            <MetricCard label='Workspace Seats' value={memberCount} valueType='number' accentColor='cyan' secondaryInfo={`Limit ${currentOrg?.seat_limit ?? 5}`} />
            <MetricCard label='Shared Deals' value={dealCount} valueType='number' accentColor='emerald' secondaryInfo='Saved M&A scenarios' />
            <MetricCard label='Model Library' value={modelCount} valueType='number' accentColor='violet' secondaryInfo='DCF and LBO models' />
          </div>

          <div className='grid gap-6 lg:grid-cols-[1.15fr_0.85fr]'>
            <PremiumCard accentColor='primary'>
              <div className='space-y-5'>
                <div>
                  <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Organization Intelligence</p>
                  <h2 className='mt-2 font-display text-2xl text-text-primary'>Firm operating snapshot</h2>
                </div>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'>
                    <div className='flex items-center gap-2'>
                      <Building2 className='h-4 w-4 text-accent-primary' />
                      <span className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Domain</span>
                    </div>
                    <p className='mt-3 font-mono text-xl text-text-primary'>{currentOrg?.domain ?? 'Not configured'}</p>
                  </div>
                  <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'>
                    <div className='flex items-center gap-2'>
                      <CreditCard className='h-4 w-4 text-accent-cyan' />
                      <span className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>AI Usage</span>
                    </div>
                    <p className='mt-3 font-mono text-xl text-text-primary'>{currentOrg?.ai_calls_used ?? 0} / {currentOrg?.ai_calls_limit ?? 100}</p>
                  </div>
                  <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'>
                    <div className='flex items-center gap-2'>
                      <Users2 className='h-4 w-4 text-accent-emerald' />
                      <span className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Member Access</span>
                    </div>
                    <p className='mt-3 font-mono text-xl text-text-primary'>{memberCount} active seats</p>
                  </div>
                  <div className='rounded-xl border border-border-subtle bg-bg-elevated p-4'>
                    <div className='flex items-center gap-2'>
                      <FolderKanban className='h-4 w-4 text-accent-violet' />
                      <span className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Visibility</span>
                    </div>
                    <p className='mt-3 font-mono text-xl text-text-primary'>{currentOrg?.allow_public_deals ? 'Public enabled' : 'Private by default'}</p>
                  </div>
                </div>
              </div>
            </PremiumCard>

            <PremiumCard accentColor='cyan'>
              <div className='space-y-5'>
                <div>
                  <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Next Actions</p>
                  <h2 className='mt-2 font-display text-2xl text-text-primary'>Shape the firm</h2>
                </div>
                <div className='space-y-3'>
                  {[
                    'Upload your firm logo and brand colors',
                    'Invite analysts and associates into the workspace',
                    'Upgrade when you need shared libraries and more AI capacity',
                    'Set deal visibility defaults for the team',
                  ].map((item) => (
                    <div key={item} className='rounded-xl border border-border-subtle bg-bg-elevated p-4 font-ui text-sm text-text-secondary'>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </PremiumCard>
          </div>

          <NewsTeaser />
        </div>
      </Main>
    </>
  )
}
