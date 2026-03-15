import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { DataValue } from '@/components/ui/data-value'
import { PremiumCard } from '@/components/ui/premium-card'
import { FinanceColumn, FinanceTable } from '@/components/ui/finance-table'
import { supabase } from '@/lib/supabase/client'
import type { DcfModel, SavedDeal } from '@/lib/supabase/types'
import { formatRelativeDate, getPurchasePrice, safeNumber } from '@/lib/deal-storage'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { usePermissions } from '@/hooks/use-permissions'
import { logActivity } from '@/lib/activity-log'

type DateRange = '7d' | '30d' | '90d' | 'all'
type HistoryTab = 'merger' | 'dcf'

type MergerRow = {
  id: string
  dealName: string
  targetCompany: string
  adResultY3: number
  proFormaEPS: number
  purchasePrice: number
  cashPct: number
  stockPct: number
  debtPct: number
  savedDate: string
  tags: string[]
  savedDeal: SavedDeal
}

type DcfRow = {
  id: string
  modelName: string
  ticker: string
  intrinsicValuePerShare: number
  currentPrice: number | null
  wacc: number
  terminalGrowth: number
  enterpriseValue: number
  savedDate: string
  savedModel: DcfModel
}

function passesDateFilter(dateValue: string, range: DateRange) {
  if (range === 'all') return true
  const days = Number.parseInt(range.replace('d', ''), 10)
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return new Date(dateValue).getTime() >= cutoff
}

function DealMixBar({ cashPct, stockPct, debtPct }: { cashPct: number; stockPct: number; debtPct: number }) {
  return (
    <div className='space-y-2'>
      <div className='flex h-2 w-28 overflow-hidden rounded-full border border-border-subtle bg-bg-elevated'>
        <div className='bg-accent-cyan' style={{ width: `${cashPct * 100}%` }} />
        <div className='bg-accent-primary' style={{ width: `${stockPct * 100}%` }} />
        <div className='bg-accent-violet' style={{ width: `${debtPct * 100}%` }} />
      </div>
      <div className='flex gap-2 font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>
        <span>C {Math.round(cashPct * 100)}%</span>
        <span>S {Math.round(stockPct * 100)}%</span>
        <span>D {Math.round(debtPct * 100)}%</span>
      </div>
    </div>
  )
}

function TagChip({ tag, onClick }: { tag: string; onClick?: (tag: string) => void }) {
  return (
    <button
      type='button'
      onClick={() => onClick?.(tag)}
      className='rounded-full border border-accent-primary/30 bg-accent-primary/10 px-2 py-1 font-ui text-[11px] text-accent-primary transition hover:border-accent-primary/60'
    >
      {tag}
    </button>
  )
}

function ComparisonCell({ left, right, format }: { left: number; right: number; format: (value: number) => JSX.Element }) {
  const leftClass = left > right ? 'bg-positive/10 border-positive/20' : ''
  const rightClass = right > left ? 'bg-positive/10 border-positive/20' : ''
  return (
    <>
      <td className={`border border-border-subtle px-4 py-3 ${leftClass}`}>{format(left)}</td>
      <td className={`border border-border-subtle px-4 py-3 ${rightClass}`}>{format(right)}</td>
    </>
  )
}

function MergerComparison({
  dealA,
  dealB,
  canExport,
}: {
  dealA: MergerRow
  dealB: MergerRow
  canExport: boolean
}) {
  const resultA = (dealA.savedDeal.result_snapshot ?? {}) as Record<string, unknown>
  const resultB = (dealB.savedDeal.result_snapshot ?? {}) as Record<string, unknown>
  const phasedA = Array.isArray(resultA.synergy_phasing) ? (resultA.synergy_phasing as Array<Record<string, unknown>>) : []
  const phasedB = Array.isArray(resultB.synergy_phasing) ? (resultB.synergy_phasing as Array<Record<string, unknown>>) : []
  const dilutionGap = Math.abs(dealA.adResultY3 - dealB.adResultY3)
  const betterDeal = dealA.adResultY3 >= dealB.adResultY3 ? dealA.dealName : dealB.dealName

  return (
    <div className='comparison-sheet space-y-4'>
      <div className='print-only hidden items-center justify-between border-b border-border-subtle pb-4'>
        <div>
          <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>QuantEdge</p>
          <h2 className='font-display text-2xl text-text-primary'>Deal Comparison Report</h2>
        </div>
        <p className='font-ui text-sm text-text-secondary'>{new Date().toLocaleDateString()}</p>
      </div>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Compare Mode</p>
          <h3 className='font-display text-2xl text-text-primary'>{dealA.dealName} vs {dealB.dealName}</h3>
        </div>
        <div className='flex items-center gap-3'>
          <div className='rounded-full border border-positive/30 bg-positive/10 px-3 py-2 font-ui text-xs text-positive'>
            {betterDeal} is less dilutive by {dilutionGap.toFixed(1)}%
          </div>
          <Button variant='outline' className='border-border-default bg-bg-elevated' disabled={!canExport} onClick={() => window.print()}>
            <FileDown className='mr-2 h-4 w-4' />
            Export Comparison as PDF
          </Button>
        </div>
      </div>

      <div className='overflow-hidden rounded-lg border border-border-subtle bg-bg-surface'>
        <table className='w-full border-collapse'>
          <thead>
            <tr className='bg-bg-elevated'>
              <th className='border border-border-subtle px-4 py-3 text-left font-ui text-[10px] uppercase tracking-[0.14em] text-text-secondary'>Metric</th>
              <th className='border border-border-subtle px-4 py-3 text-left font-display text-sm text-text-primary'>{dealA.dealName}</th>
              <th className='border border-border-subtle px-4 py-3 text-left font-display text-sm text-text-primary'>{dealB.dealName}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className='border border-border-subtle px-4 py-3 font-ui text-sm text-text-secondary'>Purchase Price</td>
              <ComparisonCell left={dealA.purchasePrice} right={dealB.purchasePrice} format={(value) => <DataValue value={value} type='currency' size='sm' />} />
            </tr>
            <tr>
              <td className='border border-border-subtle px-4 py-3 font-ui text-sm text-text-secondary'>Offer Premium %</td>
              <ComparisonCell
                left={safeNumber((dealA.savedDeal.deal_data as Record<string, unknown>)?.offer_premium_pct)}
                right={safeNumber((dealB.savedDeal.deal_data as Record<string, unknown>)?.offer_premium_pct)}
                format={(value) => <DataValue value={value} type='percentage' size='sm' />}
              />
            </tr>
            <tr>
              <td className='border border-border-subtle px-4 py-3 font-ui text-sm text-text-secondary'>Funding Mix</td>
              <td className='border border-border-subtle px-4 py-3'><DealMixBar cashPct={dealA.cashPct} stockPct={dealA.stockPct} debtPct={dealA.debtPct} /></td>
              <td className='border border-border-subtle px-4 py-3'><DealMixBar cashPct={dealB.cashPct} stockPct={dealB.stockPct} debtPct={dealB.debtPct} /></td>
            </tr>
            <tr>
              <td className='border border-border-subtle px-4 py-3 font-ui text-sm text-text-secondary'>A/D Impact Year 1</td>
              <ComparisonCell
                left={safeNumber(phasedA[0]?.accretion_pct)}
                right={safeNumber(phasedB[0]?.accretion_pct)}
                format={(value) => <DataValue value={value} type='percentage' size='sm' colorMode='auto' />}
              />
            </tr>
            <tr>
              <td className='border border-border-subtle px-4 py-3 font-ui text-sm text-text-secondary'>A/D Impact Year 2</td>
              <ComparisonCell
                left={safeNumber(phasedA[1]?.accretion_pct)}
                right={safeNumber(phasedB[1]?.accretion_pct)}
                format={(value) => <DataValue value={value} type='percentage' size='sm' colorMode='auto' />}
              />
            </tr>
            <tr>
              <td className='border border-border-subtle px-4 py-3 font-ui text-sm text-text-secondary'>A/D Impact Year 3</td>
              <ComparisonCell left={dealA.adResultY3} right={dealB.adResultY3} format={(value) => <DataValue value={value} type='percentage' size='sm' colorMode='auto' />} />
            </tr>
            <tr>
              <td className='border border-border-subtle px-4 py-3 font-ui text-sm text-text-secondary'>Pro-Forma EPS</td>
              <ComparisonCell left={dealA.proFormaEPS} right={dealB.proFormaEPS} format={(value) => <DataValue value={value} type='currency' size='sm' />} />
            </tr>
            <tr>
              <td className='border border-border-subtle px-4 py-3 font-ui text-sm text-text-secondary'>Synergies Required for Breakeven</td>
              <ComparisonCell
                left={safeNumber(resultA['Breakeven Synergies'])}
                right={safeNumber(resultB['Breakeven Synergies'])}
                format={(value) => <DataValue value={value} type='currency' size='sm' />}
              />
            </tr>
            <tr>
              <td className='border border-border-subtle px-4 py-3 font-ui text-sm text-text-secondary'>Acquirer P/E vs Target P/E</td>
              <td className='border border-border-subtle px-4 py-3'>
                <div className='flex gap-2'>
                  <DataValue value={safeNumber(resultA.acq_pe)} type='number' size='sm' />
                  <span className='font-ui text-sm text-text-muted'>vs</span>
                  <DataValue value={safeNumber(resultA.effective_tgt_pe)} type='number' size='sm' />
                </div>
              </td>
              <td className='border border-border-subtle px-4 py-3'>
                <div className='flex gap-2'>
                  <DataValue value={safeNumber(resultB.acq_pe)} type='number' size='sm' />
                  <span className='font-ui text-sm text-text-muted'>vs</span>
                  <DataValue value={safeNumber(resultB.effective_tgt_pe)} type='number' size='sm' />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className='print-only hidden border-t border-border-subtle pt-4 text-right font-ui text-xs text-text-muted'>
        QuantEdge comparison export
      </div>
    </div>
  )
}

function DcfComparison({ modelA, modelB }: { modelA: DcfRow; modelB: DcfRow }) {
  return (
    <div className='overflow-hidden rounded-lg border border-border-subtle bg-bg-surface'>
      <div className='border-b border-border-subtle bg-bg-elevated px-5 py-4'>
        <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>DCF Compare</p>
        <h3 className='font-display text-xl text-text-primary'>{modelA.modelName} vs {modelB.modelName}</h3>
      </div>
      <table className='w-full border-collapse'>
        <tbody>
          <tr>
            <td className='border border-border-subtle px-4 py-3 font-ui text-sm text-text-secondary'>Intrinsic Value / Share</td>
            <ComparisonCell left={modelA.intrinsicValuePerShare} right={modelB.intrinsicValuePerShare} format={(value) => <DataValue value={value} type='currency' size='sm' />} />
          </tr>
          <tr>
            <td className='border border-border-subtle px-4 py-3 font-ui text-sm text-text-secondary'>WACC</td>
            <ComparisonCell left={modelA.wacc} right={modelB.wacc} format={(value) => <DataValue value={value} type='percentage' size='sm' />} />
          </tr>
          <tr>
            <td className='border border-border-subtle px-4 py-3 font-ui text-sm text-text-secondary'>Terminal Growth</td>
            <ComparisonCell left={modelA.terminalGrowth} right={modelB.terminalGrowth} format={(value) => <DataValue value={value} type='percentage' size='sm' />} />
          </tr>
          <tr>
            <td className='border border-border-subtle px-4 py-3 font-ui text-sm text-text-secondary'>Enterprise Value</td>
            <ComparisonCell left={modelA.enterpriseValue} right={modelB.enterpriseValue} format={(value) => <DataValue value={value} type='currency' size='sm' />} />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function History() {
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const currentOrgId = useOrgStore((state) => state.currentOrg?.id ?? null)
  const { can } = usePermissions()
  const [activeTab, setActiveTab] = useState<HistoryTab>('merger')
  const [savedDeals, setSavedDeals] = useState<SavedDeal[]>([])
  const [dcfModels, setDcfModels] = useState<DcfModel[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [selectedMergerIds, setSelectedMergerIds] = useState<string[]>([])
  const [selectedDcfIds, setSelectedDcfIds] = useState<string[]>([])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    void fetchHistory()
  }, [currentOrgId, userId])

  async function fetchHistory() {
    if (!userId) return
    setLoading(true)
    try {
      const dealsQuery = supabase.from('saved_deals').select('*').order('created_at', { ascending: false })
      const modelsQuery = supabase.from('dcf_models').select('*').order('created_at', { ascending: false })

      const [dealResponse, dcfResponse] = await Promise.all([
        currentOrgId
          ? dealsQuery.or(`user_id.eq.${userId},and(org_id.eq.${currentOrgId},visibility.eq.org),visibility.eq.public`)
          : dealsQuery.eq('user_id', userId),
        currentOrgId
          ? modelsQuery.or(`user_id.eq.${userId},and(org_id.eq.${currentOrgId},visibility.eq.org),visibility.eq.public`)
          : modelsQuery.eq('user_id', userId),
      ])

      if (dealResponse.error) throw dealResponse.error
      if (dcfResponse.error) throw dcfResponse.error

      setSavedDeals(dealResponse.data ?? [])
      setDcfModels(dcfResponse.data ?? [])
    } catch (error: any) {
      toast.error(error.message || 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  async function deleteDeal(id: string) {
    const deal = savedDeals.find((entry) => entry.id === id)
    const isOwn = deal?.user_id === userId || deal?.created_by === userId
    if (!(isOwn ? can('deal.delete.own') : can('deal.delete.any'))) {
      toast.error('You do not have permission to delete this deal')
      return
    }
    if (!window.confirm('Delete this saved deal?')) return
    const { error } = await supabase.from('saved_deals').delete().eq('id', id)
    if (error) {
      toast.error(error.message || 'Failed to delete deal')
      return
    }
    await logActivity({
      orgId: deal?.org_id ?? currentOrgId,
      userId,
      action: 'deal.deleted',
      resourceType: 'deal',
      resourceId: id,
      metadata: { deal_name: deal?.deal_name ?? 'Saved deal' },
    })
    setSavedDeals((current) => current.filter((deal) => deal.id !== id))
    setSelectedMergerIds((current) => current.filter((entry) => entry !== id))
  }

  async function deleteDcfModel(id: string) {
    const model = dcfModels.find((entry) => entry.id === id)
    const isOwn = model?.user_id === userId || model?.created_by === userId
    if (!(isOwn ? can('deal.delete.own') : can('deal.delete.any'))) {
      toast.error('You do not have permission to delete this model')
      return
    }
    if (!window.confirm('Delete this saved DCF model?')) return
    const { error } = await supabase.from('dcf_models').delete().eq('id', id)
    if (error) {
      toast.error(error.message || 'Failed to delete model')
      return
    }
    await logActivity({
      orgId: model?.org_id ?? currentOrgId,
      userId,
      action: 'deal.deleted',
      resourceType: 'dcf_model',
      resourceId: id,
      metadata: { model_name: model?.model_name ?? 'DCF model' },
    })
    setDcfModels((current) => current.filter((model) => model.id !== id))
    setSelectedDcfIds((current) => current.filter((entry) => entry !== id))
  }

  const mergerRows = useMemo<MergerRow[]>(() => (
    savedDeals.map((savedDeal) => {
      const dealData = (savedDeal.deal_data ?? {}) as Record<string, unknown>
      const resultSnapshot = (savedDeal.result_snapshot ?? {}) as Record<string, unknown>
      const purchasePrice = safeNumber(dealData.purchasePrice, getPurchasePrice({
        tgt_share_price: safeNumber(dealData.tgt_share_price),
        tgt_shares: safeNumber(dealData.tgt_shares),
        offer_premium_pct: safeNumber(dealData.offer_premium_pct),
      }))

      return {
        id: savedDeal.id,
        dealName: savedDeal.deal_name,
        targetCompany: String(dealData.targetCompany ?? dealData.name ?? savedDeal.deal_name),
        adResultY3: safeNumber(resultSnapshot['Accretion/Dilution Percentage']),
        proFormaEPS: safeNumber(resultSnapshot['Pro-Forma EPS']),
        purchasePrice,
        cashPct: safeNumber(dealData.cash_pct),
        stockPct: safeNumber(dealData.stock_pct, 1),
        debtPct: safeNumber(dealData.debt_pct),
        savedDate: savedDeal.created_at,
        tags: savedDeal.tags ?? [],
        savedDeal,
      }
    })
  ), [savedDeals])

  const dcfRows = useMemo<DcfRow[]>(() => (
    dcfModels
      .filter((savedModel) => {
        const modelData = (savedModel.model_data ?? {}) as Record<string, unknown>
        return modelData.context !== 'lbo'
      })
      .map((savedModel) => {
      const modelData = (savedModel.model_data ?? {}) as Record<string, unknown>
      const resultSnapshot = (savedModel.result_snapshot ?? {}) as Record<string, unknown>
      return {
        id: savedModel.id,
        modelName: savedModel.model_name,
        ticker: String(savedModel.ticker ?? modelData.ticker ?? '-'),
        intrinsicValuePerShare: safeNumber(resultSnapshot.share_price_pgm),
        currentPrice: typeof (modelData.importedCompany as Record<string, unknown> | undefined)?.price === 'number'
          ? Number((modelData.importedCompany as Record<string, unknown>).price)
          : null,
        wacc: safeNumber(modelData.wacc),
        terminalGrowth: safeNumber(modelData.terminal_growth_rate),
        enterpriseValue: safeNumber(resultSnapshot.enterprise_value_pgm),
        savedDate: savedModel.created_at,
        savedModel,
      }
    })
  ), [dcfModels])

  const filteredMergerRows = useMemo(() => mergerRows.filter((row) => {
    const matchesSearch = [row.dealName, row.targetCompany].some((value) => value.toLowerCase().includes(search.toLowerCase()))
    const matchesDate = passesDateFilter(row.savedDate, dateRange)
    const matchesTag = activeTag ? row.tags.includes(activeTag) : true
    return matchesSearch && matchesDate && matchesTag
  }), [activeTag, dateRange, mergerRows, search])

  const filteredDcfRows = useMemo(() => dcfRows.filter((row) => {
    const matchesSearch = [row.modelName, row.ticker].some((value) => value.toLowerCase().includes(search.toLowerCase()))
    const matchesDate = passesDateFilter(row.savedDate, dateRange)
    return matchesSearch && matchesDate
  }), [dateRange, dcfRows, search])

  const comparedMergerDeals = filteredMergerRows.filter((row) => selectedMergerIds.includes(row.id)).slice(0, 2)
  const comparedDcfModels = filteredDcfRows.filter((row) => selectedDcfIds.includes(row.id)).slice(0, 2)

  const mergerColumns: FinanceColumn<MergerRow>[] = [
    {
      id: 'select',
      key: 'id',
      title: '',
      render: (_value, row) => (
        <Checkbox
          checked={selectedMergerIds.includes(row.id)}
          onCheckedChange={(checked) => {
            setSelectedMergerIds((current) => checked
              ? [...current.filter((entry) => entry !== row.id), row.id].slice(-2)
              : current.filter((entry) => entry !== row.id))
          }}
        />
      ),
    },
    {
      key: 'dealName',
      title: 'Deal Name',
      sortable: true,
      render: (value, row) => (
        <button type='button' className='font-display text-left text-sm text-text-primary hover:text-accent-primary' onClick={() => window.location.assign(`/merger-analysis?dealId=${row.id}`)}>
          {String(value)}
        </button>
      ),
    },
    { key: 'targetCompany', title: 'Target Company', sortable: true },
    {
      key: 'adResultY3',
      title: 'A/D Result Y3',
      type: 'percentage',
      sortable: true,
      render: (value) => <DataValue value={safeNumber(value)} type='percentage' size='sm' colorMode='auto' />,
    },
    {
      key: 'proFormaEPS',
      title: 'Pro-Forma EPS',
      type: 'currency',
      sortable: true,
    },
    {
      key: 'purchasePrice',
      title: 'Purchase Price',
      type: 'currency',
      sortable: true,
    },
    {
      key: 'cashPct',
      title: 'Deal Mix',
      render: (_value, row) => <DealMixBar cashPct={row.cashPct} stockPct={row.stockPct} debtPct={row.debtPct} />,
    },
    {
      key: 'savedDate',
      title: 'Saved Date',
      type: 'date',
      sortable: true,
      render: (value) => (
        <div>
          <p className='font-ui text-sm text-text-primary'>{new Date(String(value)).toLocaleDateString()}</p>
          <p className='font-ui text-xs text-text-muted'>{formatRelativeDate(String(value))}</p>
        </div>
      ),
    },
    {
      key: 'tags',
      title: 'Tags',
      render: (_value, row) => (
        <div className='flex flex-wrap gap-2'>
          {row.tags.length ? row.tags.map((tag) => <TagChip key={tag} tag={tag} onClick={setActiveTag} />) : <span className='font-ui text-sm text-text-muted'>-</span>}
        </div>
      ),
    },
    {
      id: 'actions',
      key: 'id',
      title: 'Actions',
      render: (_value, row) => (
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' size='sm' className='border-border-default bg-bg-elevated' onClick={() => window.location.assign(`/merger-analysis?dealId=${row.id}`)}>
            Open
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='border-border-default bg-bg-elevated'
            onClick={() => setSelectedMergerIds((current) => [...current.filter((entry) => entry !== row.id), row.id].slice(-2))}
          >
            Compare
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='border-border-default bg-bg-elevated text-negative'
            disabled={!((row.savedDeal.user_id === userId || row.savedDeal.created_by === userId) ? can('deal.delete.own') : can('deal.delete.any'))}
            onClick={() => void deleteDeal(row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  const dcfColumns: FinanceColumn<DcfRow>[] = [
    {
      id: 'select',
      key: 'id',
      title: '',
      render: (_value, row) => (
        <Checkbox
          checked={selectedDcfIds.includes(row.id)}
          onCheckedChange={(checked) => {
            setSelectedDcfIds((current) => checked
              ? [...current.filter((entry) => entry !== row.id), row.id].slice(-2)
              : current.filter((entry) => entry !== row.id))
          }}
        />
      ),
    },
    {
      key: 'modelName',
      title: 'Model Name',
      sortable: true,
      render: (value, row) => (
        <button type='button' className='font-display text-left text-sm text-text-primary hover:text-accent-primary' onClick={() => window.location.assign(`/dcf?modelId=${row.id}`)}>
          {String(value)}
        </button>
      ),
    },
    { key: 'ticker', title: 'Ticker', sortable: true },
    {
      key: 'intrinsicValuePerShare',
      title: 'Intrinsic Value / Share',
      type: 'currency',
      sortable: true,
      render: (_value, row) => {
        const tone = row.currentPrice == null ? 'default' : row.intrinsicValuePerShare >= row.currentPrice ? 'positive' : 'negative'
        return (
          <div className='space-y-1 text-right'>
            <DataValue value={row.intrinsicValuePerShare} type='currency' size='sm' colorMode={tone} />
            {row.currentPrice != null ? <p className='font-ui text-xs text-text-muted'>vs ${row.currentPrice.toFixed(2)} current</p> : null}
          </div>
        )
      },
    },
    {
      key: 'wacc',
      title: 'WACC | T. Growth',
      sortable: true,
      render: (_value, row) => (
        <div className='space-y-1 text-right'>
          <DataValue value={row.wacc} type='percentage' size='sm' />
          <DataValue value={row.terminalGrowth} type='percentage' size='sm' />
        </div>
      ),
    },
    {
      key: 'enterpriseValue',
      title: 'Enterprise Value',
      type: 'currency',
      sortable: true,
    },
    {
      key: 'savedDate',
      title: 'Saved Date',
      type: 'date',
      sortable: true,
      render: (value) => (
        <div>
          <p className='font-ui text-sm text-text-primary'>{new Date(String(value)).toLocaleDateString()}</p>
          <p className='font-ui text-xs text-text-muted'>{formatRelativeDate(String(value))}</p>
        </div>
      ),
    },
    {
      id: 'actions',
      key: 'id',
      title: 'Actions',
      render: (_value, row) => (
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' size='sm' className='border-border-default bg-bg-elevated' onClick={() => window.location.assign(`/dcf?modelId=${row.id}`)}>
            Open
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='border-border-default bg-bg-elevated'
            onClick={() => setSelectedDcfIds((current) => [...current.filter((entry) => entry !== row.id), row.id].slice(-2))}
          >
            Compare
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='border-border-default bg-bg-elevated text-negative'
            disabled={!((row.savedModel.user_id === userId || row.savedModel.created_by === userId) ? can('deal.delete.own') : can('deal.delete.any'))}
            onClick={() => void deleteDcfModel(row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className='min-h-screen bg-bg-base'>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .comparison-sheet, .comparison-sheet * { visibility: visible; }
          .comparison-sheet { position: absolute; left: 0; top: 0; width: 100%; background: #060608; padding: 24px; }
          .print-only { display: flex !important; }
        }
      `}</style>
      <div className='space-y-8 p-6 md:p-8'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>QuantEdge / History</p>
            <h1 className='font-display text-4xl font-semibold tracking-[-0.03em] text-text-primary'>Saved Models and Deal Archive</h1>
            <p className='mt-2 font-ui text-sm text-text-secondary'>Search, reload, compare, and prune your saved merger deals and DCF models.</p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search by name or ticker'
              className='w-64 border-border-subtle bg-bg-surface text-text-primary'
            />
            {(['7d', '30d', '90d', 'all'] as DateRange[]).map((range) => (
              <Button
                key={range}
                variant='outline'
                size='sm'
                className={dateRange === range ? 'border-accent-primary bg-accent-primary/10 text-accent-primary' : 'border-border-default bg-bg-surface'}
                onClick={() => setDateRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>

        {activeTab === 'merger' && comparedMergerDeals.length === 2 ? (
          <MergerComparison dealA={comparedMergerDeals[0]} dealB={comparedMergerDeals[1]} canExport={can('export.pdf')} />
        ) : null}

        {activeTab === 'dcf' && comparedDcfModels.length === 2 ? (
          <DcfComparison modelA={comparedDcfModels[0]} modelB={comparedDcfModels[1]} />
        ) : null}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as HistoryTab)} className='space-y-6'>
          <TabsList className='bg-bg-elevated'>
            <TabsTrigger value='merger' className='data-[state=active]:bg-bg-surface data-[state=active]:text-text-primary'>Merger Deals</TabsTrigger>
            <TabsTrigger value='dcf' className='data-[state=active]:bg-bg-surface data-[state=active]:text-text-primary'>DCF Models</TabsTrigger>
          </TabsList>

          <TabsContent value='merger' className='space-y-4'>
            <PremiumCard accentColor='primary'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <p className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Filters</p>
                  <div className='mt-2 flex flex-wrap gap-2'>
                    {Array.from(new Set(mergerRows.flatMap((row) => row.tags))).map((tag) => (
                      <TagChip key={tag} tag={tag} onClick={(value) => setActiveTag(activeTag === value ? null : value)} />
                    ))}
                    {activeTag ? (
                      <Button variant='outline' size='sm' className='border-border-default bg-bg-elevated' onClick={() => setActiveTag(null)}>
                        Clear Tag
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='border-border-default bg-bg-elevated'
                    disabled={selectedMergerIds.length !== 2}
                    onClick={() => setSelectedMergerIds(selectedMergerIds.slice(-2))}
                  >
                    <ArrowRightLeft className='mr-2 h-4 w-4' />
                    Compare Selected
                  </Button>
                </div>
              </div>
            </PremiumCard>
            <FinanceTable
              data={filteredMergerRows}
              columns={mergerColumns}
              loading={loading}
              emptyMessage='Save a merger deal to build your deal archive.'
            />
          </TabsContent>

          <TabsContent value='dcf' className='space-y-4'>
            <PremiumCard accentColor='violet'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <p className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Saved DCF Models</p>
                  <p className='mt-1 font-ui text-sm text-text-secondary'>Track intrinsic value assumptions and reopen models from where they were saved.</p>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  className='border-border-default bg-bg-elevated'
                  disabled={selectedDcfIds.length !== 2}
                  onClick={() => setSelectedDcfIds(selectedDcfIds.slice(-2))}
                >
                  <ArrowRightLeft className='mr-2 h-4 w-4' />
                  Compare Selected
                </Button>
              </div>
            </PremiumCard>
            <FinanceTable
              data={filteredDcfRows}
              columns={dcfColumns}
              loading={loading}
              emptyMessage='Save a DCF model to build your valuation history.'
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
