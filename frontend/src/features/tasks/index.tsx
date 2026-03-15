import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { FinanceTable, type FinanceColumn } from '@/components/ui/finance-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MetricCard } from '@/components/ui/metric-card'
import { PremiumCard } from '@/components/ui/premium-card'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'

type TaskStatus = 'open' | 'in_progress' | 'done'
type TaskPriority = 'low' | 'medium' | 'high'

type TaskItem = {
  id: string
  title: string
  source: string
  priority: TaskPriority
  status: TaskStatus
  relatedUrl: string | null
  createdAt: string
  origin: 'manual' | 'suggested'
}

type SavedDealRow = { id: string; deal_name: string; updated_at: string }
type ModelRow = { id: string; model_name: string; model_data: Record<string, unknown> | null; updated_at: string }
type WatchlistRow = { ticker: string; added_at: string }
type InvitationRow = { id: string; email: string; expires_at: string }

function taskStorageKey(userId: string | null, orgId: string | null) {
  return `qe-deal-tasks:${userId ?? 'guest'}:${orgId ?? 'personal'}`
}

function loadManualTasks(userId: string | null, orgId: string | null): TaskItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(taskStorageKey(userId, orgId)) || '[]') as TaskItem[]
  } catch {
    return []
  }
}

function saveManualTasks(userId: string | null, orgId: string | null, tasks: TaskItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(taskStorageKey(userId, orgId), JSON.stringify(tasks))
}

function priorityBadge(priority: TaskPriority) {
  const styles: Record<TaskPriority, string> = {
    low: 'border-border-subtle bg-bg-elevated text-text-secondary',
    medium: 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber',
    high: 'border-negative/30 bg-negative/10 text-negative',
  }
  return <span className={`rounded-full border px-2 py-1 font-ui text-[10px] uppercase tracking-[0.12em] ${styles[priority]}`}>{priority}</span>
}

function statusBadge(status: TaskStatus) {
  const styles: Record<TaskStatus, string> = {
    open: 'border-border-subtle bg-bg-elevated text-text-secondary',
    in_progress: 'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan',
    done: 'border-positive/30 bg-positive/10 text-positive',
  }
  return <span className={`rounded-full border px-2 py-1 font-ui text-[10px] uppercase tracking-[0.12em] ${styles[status]}`}>{status.replace('_', ' ')}</span>
}

export function Tasks() {
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const currentOrg = useOrgStore((state) => state.currentOrg)
  const [manualTasks, setManualTasks] = useState<TaskItem[]>([])
  const [suggestedTasks, setSuggestedTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [relatedUrl, setRelatedUrl] = useState('')

  useEffect(() => {
    setManualTasks(loadManualTasks(userId, currentOrg?.id ?? null))
  }, [userId, currentOrg?.id])

  useEffect(() => {
    if (!userId) return
    void loadSuggestedTasks()
  }, [userId, currentOrg?.id])

  useEffect(() => {
    saveManualTasks(userId, currentOrg?.id ?? null, manualTasks)
  }, [manualTasks, userId, currentOrg?.id])

  async function loadSuggestedTasks() {
    if (!userId) return
    setLoading(true)
    try {
      const dealQuery = supabase.from('saved_deals').select('id, deal_name, updated_at').order('updated_at', { ascending: false }).limit(4)
      const modelQuery = supabase.from('dcf_models').select('id, model_name, model_data, updated_at').order('updated_at', { ascending: false }).limit(4)
      const watchlistQuery = supabase.from('watchlist').select('ticker, added_at').order('added_at', { ascending: false }).limit(3)
      const inviteQuery = currentOrg?.id
        ? supabase.from('org_invitations').select('id, email, expires_at').eq('org_id', currentOrg.id).eq('status', 'pending').limit(3)
        : Promise.resolve({ data: [] as InvitationRow[], error: null })

      const [dealsResp, modelsResp, watchResp, inviteResp] = await Promise.all([dealQuery, modelQuery, watchlistQuery, inviteQuery])

      const deals = ((dealsResp.data ?? []) as SavedDealRow[]).map((deal) => ({
        id: `deal-${deal.id}`,
        title: `Pressure-test merger deal ${deal.deal_name}`,
        source: 'Merger Analysis',
        priority: 'high' as TaskPriority,
        status: 'open' as TaskStatus,
        relatedUrl: `/merger-analysis?dealId=${deal.id}`,
        createdAt: deal.updated_at,
        origin: 'suggested' as const,
      }))

      const models = ((modelsResp.data ?? []) as ModelRow[]).map((model) => ({
        id: `model-${model.id}`,
        title: `Refresh ${model.model_data?.context === 'lbo' ? 'LBO' : 'DCF'} model ${model.model_name}`,
        source: model.model_data?.context === 'lbo' ? 'LBO Quick Model' : 'DCF Valuation',
        priority: 'medium' as TaskPriority,
        status: 'open' as TaskStatus,
        relatedUrl: model.model_data?.context === 'lbo' ? `/lbo-model?modelId=${model.id}` : `/dcf?modelId=${model.id}`,
        createdAt: model.updated_at,
        origin: 'suggested' as const,
      }))

      const watchItems = ((watchResp.data ?? []) as WatchlistRow[]).map((item) => ({
        id: `watch-${item.ticker}`,
        title: `Review watchlist movement for ${item.ticker}`,
        source: 'Watchlist',
        priority: 'low' as TaskPriority,
        status: 'open' as TaskStatus,
        relatedUrl: '/watchlist',
        createdAt: item.added_at,
        origin: 'suggested' as const,
      }))

      const inviteItems = ((inviteResp.data ?? []) as InvitationRow[]).map((invite) => ({
        id: `invite-${invite.id}`,
        title: `Follow up on pending invite for ${invite.email}`,
        source: 'Firm Admin',
        priority: 'medium' as TaskPriority,
        status: 'in_progress' as TaskStatus,
        relatedUrl: '/admin?tab=members',
        createdAt: invite.expires_at,
        origin: 'suggested' as const,
      }))

      setSuggestedTasks([...inviteItems, ...deals, ...models, ...watchItems])
    } finally {
      setLoading(false)
    }
  }

  function addTask() {
    if (!title.trim()) return
    setManualTasks((current) => [
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        source: 'Manual',
        priority,
        status: 'open',
        relatedUrl: relatedUrl.trim() || null,
        createdAt: new Date().toISOString(),
        origin: 'manual',
      },
      ...current,
    ])
    setTitle('')
    setPriority('medium')
    setRelatedUrl('')
  }

  function updateTask(taskId: string, status: TaskStatus) {
    setManualTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)))
  }

  function removeTask(taskId: string) {
    setManualTasks((current) => current.filter((task) => task.id !== taskId))
  }

  const rows = useMemo(() => [...manualTasks, ...suggestedTasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [manualTasks, suggestedTasks])

  const openCount = rows.filter((task) => task.status === 'open').length
  const progressCount = rows.filter((task) => task.status === 'in_progress').length
  const doneCount = rows.filter((task) => task.status === 'done').length

  const columns: FinanceColumn<TaskItem>[] = [
    { key: 'title', title: 'Task', sortable: true, render: (value, row) => <div><p className='font-ui text-sm text-text-primary'>{String(value)}</p><p className='font-ui text-xs text-text-muted'>{row.source}</p></div> },
    { key: 'priority', title: 'Priority', sortable: true, render: (value) => priorityBadge(value as TaskPriority) },
    { key: 'status', title: 'Status', sortable: true, render: (value, row) => row.origin === 'manual' ? (
      <select value={row.status} onChange={(event) => updateTask(row.id, event.target.value as TaskStatus)} className='rounded-md border border-border-subtle bg-bg-elevated px-2 py-1 font-ui text-xs text-text-primary'>
        <option value='open'>Open</option>
        <option value='in_progress'>In Progress</option>
        <option value='done'>Done</option>
      </select>
    ) : statusBadge(value as TaskStatus) },
    { key: 'createdAt', title: 'Updated', sortable: true, type: 'date' },
    {
      key: 'id',
      title: 'Actions',
      render: (_value, row) => (
        <div className='flex items-center justify-end gap-2'>
          {row.relatedUrl ? (
            <Button variant='outline' size='sm' onClick={() => window.location.assign(row.relatedUrl!)}>
              Open
            </Button>
          ) : null}
          {row.origin === 'manual' ? (
            <Button variant='ghost' size='icon' onClick={() => removeTask(row.id)}>
              <Trash2 className='h-4 w-4 text-negative' />
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

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
            <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>Execution / Deal Tasks</p>
            <h1 className='font-display text-4xl tracking-[-0.04em] text-text-primary'>Deal Task Board</h1>
            <p className='mt-2 font-ui text-sm text-text-secondary'>Track follow-ups around saved deals, valuation models, watchlist names, and firm actions.</p>
          </div>
          <Button onClick={addTask}><Plus className='mr-2 h-4 w-4' />Add Task</Button>
        </div>

        <div className='grid gap-4 md:grid-cols-3'>
          <MetricCard label='Open' value={openCount} valueType='number' accentColor='rose' secondaryInfo='Needs attention' />
          <MetricCard label='In Progress' value={progressCount} valueType='number' accentColor='cyan' secondaryInfo='Work underway' />
          <MetricCard label='Completed' value={doneCount} valueType='number' accentColor='emerald' secondaryInfo='Closed items' />
        </div>

        <PremiumCard accentColor='primary'>
          <div className='grid gap-4 lg:grid-cols-[1.2fr_180px_1fr_auto] lg:items-end'>
            <div className='space-y-2'>
              <Label className='text-label-sm'>Task Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder='Review Project Atlas synergies or refresh a DCF model' className='border-border-subtle bg-bg-elevated' />
            </div>
            <div className='space-y-2'>
              <Label className='text-label-sm'>Priority</Label>
              <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)} className='h-10 rounded-md border border-border-subtle bg-bg-elevated px-3 font-ui text-sm text-text-primary'>
                <option value='low'>Low</option>
                <option value='medium'>Medium</option>
                <option value='high'>High</option>
              </select>
            </div>
            <div className='space-y-2'>
              <Label className='text-label-sm'>Related Link</Label>
              <Input value={relatedUrl} onChange={(event) => setRelatedUrl(event.target.value)} placeholder='/merger-analysis?dealId=...' className='border-border-subtle bg-bg-elevated' />
            </div>
            <Button onClick={addTask} className='h-10'>Create</Button>
          </div>
        </PremiumCard>

        <FinanceTable data={rows} columns={columns} loading={loading} emptyMessage='Create a task or save a model to start building an execution queue.' />

        <PremiumCard accentColor='violet'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Workflow</p>
              <h2 className='mt-2 font-display text-2xl text-text-primary'>Suggested operating rhythm</h2>
            </div>
            <div className='flex flex-wrap gap-2'>
              {[
                'Save a merger deal',
                'Save a DCF or LBO model',
                'Add names to watchlist',
                'Promote live items into manual tasks',
              ].map((step) => (
                <div key={step} className='inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-elevated px-3 py-2 font-ui text-xs text-text-secondary'>
                  <ArrowRight className='h-3.5 w-3.5 text-accent-violet' />
                  {step}
                </div>
              ))}
            </div>
          </div>
        </PremiumCard>
      </Main>
    </>
  )
}
