import { useEffect, useMemo, useState } from 'react'
import { Copy, Pin, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { PremiumCard } from '@/components/ui/premium-card'
import { FinanceTable, type FinanceColumn } from '@/components/ui/finance-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FeatureGate } from '@/components/feature-gate'
import { supabase } from '@/lib/supabase/client'
import { logActivity } from '@/lib/activity-log'
import type { DcfModel, Profile, SavedDeal } from '@/lib/supabase/types'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { usePermissions } from '@/hooks/use-permissions'

type LibraryType = 'all' | 'merger' | 'dcf' | 'lbo'
type SortMode = 'recent' | 'author'

type LibraryRow = {
  id: string
  source: 'saved_deals' | 'dcf_models'
  type: 'merger' | 'dcf' | 'lbo'
  name: string
  authorId: string | null
  authorName: string
  lastModified: string
  resultSummary: string
  isPinned: boolean
  visibility: 'private' | 'org' | 'public'
  merger?: SavedDeal
  model?: DcfModel
}

export default function FirmLibraryPage() {
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const currentOrg = useOrgStore((state) => state.currentOrg)
  const { can } = usePermissions()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<LibraryRow[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<LibraryType>('all')
  const [authorFilter, setAuthorFilter] = useState('all')
  const [sortMode, setSortMode] = useState<SortMode>('recent')

  useEffect(() => {
    if (!currentOrg?.id || !userId) {
      setLoading(false)
      return
    }
    void loadLibrary()
  }, [currentOrg?.id, userId])

  async function loadLibrary() {
    if (!currentOrg?.id) return
    setLoading(true)
    try {
      const [dealsResponse, modelsResponse, membersResponse] = await Promise.all([
        supabase.from('saved_deals').select('*').eq('org_id', currentOrg.id).in('visibility', ['org', 'public']).order('is_pinned', { ascending: false }).order('updated_at', { ascending: false }),
        supabase.from('dcf_models').select('*').eq('org_id', currentOrg.id).in('visibility', ['org', 'public']).order('updated_at', { ascending: false }),
        supabase.from('org_members').select('user_id').eq('org_id', currentOrg.id),
      ])
      if (dealsResponse.error) throw dealsResponse.error
      if (modelsResponse.error) throw modelsResponse.error
      if (membersResponse.error) throw membersResponse.error

      const profileIds = Array.from(new Set([
        ...(membersResponse.data ?? []).map((entry) => entry.user_id),
        ...((dealsResponse.data ?? []).map((deal) => deal.created_by).filter(Boolean) as string[]),
        ...((modelsResponse.data ?? []).map((model) => model.created_by).filter(Boolean) as string[]),
      ]))
      const profileResponse = profileIds.length ? await supabase.from('profiles').select('id, full_name').in('id', profileIds) : { data: [] as Pick<Profile, 'id' | 'full_name'>[], error: null }
      if (profileResponse.error) throw profileResponse.error
      const authorMap = new Map((profileResponse.data ?? []).map((profile) => [profile.id, profile.full_name]))

      const mergerRows: LibraryRow[] = (dealsResponse.data ?? []).map((deal) => ({
        id: deal.id,
        source: 'saved_deals',
        type: 'merger',
        name: deal.deal_name,
        authorId: deal.created_by,
        authorName: deal.created_by ? authorMap.get(deal.created_by) ?? 'Team member' : 'Team member',
        lastModified: deal.updated_at,
        resultSummary: `${Number((deal.result_snapshot as Record<string, unknown> | null)?.['Accretion/Dilution Percentage'] ?? 0).toFixed(1)}% A/D`,
        isPinned: !!deal.is_pinned,
        visibility: deal.visibility,
        merger: deal,
      }))

      const modelRows: LibraryRow[] = (modelsResponse.data ?? []).map((model) => {
        const context = String((model.model_data as Record<string, unknown> | null)?.context ?? 'dcf')
        const isLbo = context === 'lbo'
        const primaryValue = isLbo
          ? `${Number((model.result_snapshot as Record<string, unknown> | null)?.moic ?? 0).toFixed(2)}x MOIC`
          : `$${Number((model.result_snapshot as Record<string, unknown> | null)?.share_price_pgm ?? 0).toFixed(2)}/sh`
        return {
          id: model.id,
          source: 'dcf_models',
          type: isLbo ? 'lbo' : 'dcf',
          name: model.model_name,
          authorId: model.created_by,
          authorName: model.created_by ? authorMap.get(model.created_by) ?? 'Team member' : 'Team member',
          lastModified: model.updated_at,
          resultSummary: primaryValue,
          isPinned: false,
          visibility: model.visibility,
          model,
        }
      })

      setRows([...mergerRows, ...modelRows])
    } catch (error: any) {
      toast.error(error.message || 'Failed to load the firm library')
    } finally {
      setLoading(false)
    }
  }

  async function cloneRow(row: LibraryRow) {
    if (!userId) return
    try {
      if (row.source === 'saved_deals' && row.merger) {
        const { data, error } = await supabase.from('saved_deals').insert({
          user_id: userId,
          deal_name: `${row.name} (Clone)`,
          deal_data: row.merger.deal_data,
          result_snapshot: row.merger.result_snapshot,
          is_public: false,
          tags: row.merger.tags,
          org_id: currentOrg?.id ?? null,
          visibility: 'private',
          parent_deal_id: row.merger.id,
          created_by: userId,
          last_edited_by: userId,
          is_pinned: false,
        } as never).select('id').single()
        if (error) throw error
        await logActivity({ orgId: currentOrg?.id ?? null, userId, action: 'deal.cloned', resourceType: 'deal', resourceId: data.id, metadata: { deal_name: row.name } })
        toast.success('Deal cloned to your private workspace')
        return
      }

      if (row.source === 'dcf_models' && row.model) {
        const { data, error } = await supabase.from('dcf_models').insert({
          user_id: userId,
          model_name: `${row.name} (Clone)`,
          ticker: row.model.ticker,
          model_data: row.model.model_data,
          result_snapshot: row.model.result_snapshot,
          is_public: false,
          org_id: currentOrg?.id ?? null,
          visibility: 'private',
          created_by: userId,
          last_edited_by: userId,
        } as never).select('id').single()
        if (error) throw error
        await logActivity({ orgId: currentOrg?.id ?? null, userId, action: 'deal.cloned', resourceType: 'dcf_model', resourceId: data.id, metadata: { model_name: row.name } })
        toast.success('Model cloned to your private workspace')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to clone library item')
    }
  }

  async function unshareRow(row: LibraryRow) {
    try {
      if (row.source === 'saved_deals') {
        const { error } = await supabase.from('saved_deals').update({ visibility: 'private' }).eq('id', row.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('dcf_models').update({ visibility: 'private' }).eq('id', row.id)
        if (error) throw error
      }
      await logActivity({ orgId: currentOrg?.id ?? null, userId, action: 'deal.shared', resourceType: row.source === 'saved_deals' ? 'deal' : 'dcf_model', resourceId: row.id, metadata: { visibility: 'private' } })
      toast.success('Item moved out of the firm library')
      await loadLibrary()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update sharing')
    }
  }

  async function deleteRow(row: LibraryRow) {
    if (!window.confirm(`Delete ${row.name}?`)) return
    try {
      const table = row.source === 'saved_deals' ? 'saved_deals' : 'dcf_models'
      const { error } = await supabase.from(table).delete().eq('id', row.id)
      if (error) throw error
      await logActivity({ orgId: currentOrg?.id ?? null, userId, action: 'deal.deleted', resourceType: row.source === 'saved_deals' ? 'deal' : 'dcf_model', resourceId: row.id, metadata: { name: row.name } })
      toast.success('Item deleted')
      await loadLibrary()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete library item')
    }
  }

  const filteredRows = useMemo(() => {
    return [...rows]
      .filter((row) => typeFilter === 'all' || row.type === typeFilter)
      .filter((row) => authorFilter === 'all' || row.authorId === authorFilter)
      .filter((row) => [row.name, row.authorName, row.resultSummary].some((value) => value.toLowerCase().includes(search.toLowerCase())))
      .sort((left, right) => {
        if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1
        if (sortMode === 'author') return left.authorName.localeCompare(right.authorName)
        return new Date(right.lastModified).getTime() - new Date(left.lastModified).getTime()
      })
  }, [authorFilter, rows, search, sortMode, typeFilter])

  const authorOptions = useMemo(() => Array.from(new Map(rows.filter((row) => row.authorId).map((row) => [row.authorId!, row.authorName])).entries()), [rows])

  const columns: FinanceColumn<LibraryRow>[] = [
    {
      key: 'name',
      title: 'Deal / Model',
      sortable: true,
      render: (value, row) => (
        <div className='flex items-center gap-2'>
          {row.isPinned ? <Pin className='h-4 w-4 text-accent-amber' /> : null}
          <div>
            <button type='button' className='font-display text-left text-sm text-text-primary hover:text-accent-primary' onClick={() => window.location.assign(row.source === 'saved_deals' ? `/merger-analysis?dealId=${row.id}` : `/dcf?modelId=${row.id}`)}>
              {String(value)}
            </button>
            <p className='font-ui text-xs uppercase tracking-[0.12em] text-text-muted'>{row.type.toUpperCase()}</p>
          </div>
        </div>
      ),
    },
    { key: 'authorName', title: 'Author', sortable: true },
    { key: 'lastModified', title: 'Last Modified', type: 'date', sortable: true },
    { key: 'resultSummary', title: 'Result Snapshot', sortable: true },
    {
      id: 'actions',
      key: 'id',
      title: 'Actions',
      render: (_value, row) => (
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' size='sm' className='border-border-default bg-bg-elevated' onClick={() => window.location.assign(row.source === 'saved_deals' ? `/merger-analysis?dealId=${row.id}` : `/dcf?modelId=${row.id}`)}>Open</Button>
          <Button variant='outline' size='sm' className='border-border-default bg-bg-elevated' onClick={() => void cloneRow(row)}><Copy className='mr-2 h-4 w-4' />Clone</Button>
          <Button variant='outline' size='sm' className='border-border-default bg-bg-elevated' disabled={!can('deal.share.org')} onClick={() => void unshareRow(row)}>Unshare</Button>
          <Button variant='outline' size='sm' className='border-border-default bg-bg-elevated text-negative' disabled={!can('deal.delete.any')} onClick={() => void deleteRow(row)}><Trash2 className='mr-2 h-4 w-4' />Delete</Button>
        </div>
      ),
    },
  ]

  if (!currentOrg) {
    return <div className='min-h-screen bg-bg-base p-8 font-ui text-text-secondary'>Switch into a firm workspace to access the firm library.</div>
  }

  return (
    <div className='min-h-screen bg-bg-base'>
      <div className='space-y-8 p-6 md:p-8'>
        <div>
          <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>QuantEdge / Firm Library</p>
          <h1 className='font-display text-4xl tracking-[-0.03em] text-text-primary'>Shared Firm Deal Library</h1>
          <p className='mt-2 font-ui text-sm text-text-secondary'>Browse models shared across {currentOrg.name}, clone them privately, and manage distribution across the workspace.</p>
        </div>

        <FeatureGate feature='shared_library'>
          <PremiumCard accentColor='primary'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='flex flex-wrap gap-3'>
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search models, authors, or metrics' className='w-64 border-border-subtle bg-bg-elevated text-text-primary' />
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as LibraryType)} className='rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-ui text-sm text-text-primary'>
                  <option value='all'>All Types</option>
                  <option value='merger'>Merger Deals</option>
                  <option value='dcf'>DCF Models</option>
                  <option value='lbo'>LBO Models</option>
                </select>
                <select value={authorFilter} onChange={(event) => setAuthorFilter(event.target.value)} className='rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-ui text-sm text-text-primary'>
                  <option value='all'>All Authors</option>
                  {authorOptions.map(([authorId, authorName]) => <option key={authorId} value={authorId}>{authorName}</option>)}
                </select>
                <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className='rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-ui text-sm text-text-primary'>
                  <option value='recent'>Most Recent</option>
                  <option value='author'>Author</option>
                </select>
              </div>
              <div className='rounded-full border border-border-subtle bg-bg-elevated px-3 py-2 font-ui text-xs text-text-secondary'>
                <Users className='mr-2 inline-block h-4 w-4' />
                {filteredRows.length} shared items
              </div>
            </div>
          </PremiumCard>
          <FinanceTable data={filteredRows} columns={columns} loading={loading} emptyMessage='No firm-shared models are available yet.' />
        </FeatureGate>
      </div>
    </div>
  )
}
