import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { RefreshCw, Search, TrendingUp } from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { DataValue } from '@/components/ui/data-value'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MetricCard } from '@/components/ui/metric-card'
import { PremiumCard } from '@/components/ui/premium-card'
import { PremiumSlider } from '@/components/ui/premium-slider'
import { ChartSkeleton, HeatmapSkeleton, MetricCardSkeleton } from '@/components/ui/skeleton'
import { AIChatPanel } from '@/components/ai/ai-chat-panel'
import { CompanyCard } from '@/components/market/company-card'
import { TickerNewsStrip } from '@/components/news/ticker-news-strip'
import { TickerSearch } from '@/components/market/ticker-search'
import { ViewerPresence } from '@/components/collaboration/viewer-presence'
import { fetchCompanySnapshot, SearchResult } from '@/lib/market/market-api'
import { buildDcfSavePayload, dcfFormFromSavedModel, formatRelativeDate, getCurrentDcfVersion, safeNumber } from '@/lib/deal-storage'
import type { DcfModel } from '@/lib/supabase/types'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { usePermissions } from '@/hooks/use-permissions'
import { logActivity } from '@/lib/activity-log'
import { apiUrl } from '@/lib/api'

type DcfForm = {
  revenue_base: number
  revenue_growth: number
  ebitda_margins: number
  tax_rate: number
  wacc: number
  terminal_growth_rate: number
  exit_multiple: number
  total_debt: number
  cash: number
  shares_outstanding: number
}

const initialForm: DcfForm = {
  revenue_base: 100,
  revenue_growth: 0.1,
  ebitda_margins: 0.2,
  tax_rate: 0.21,
  wacc: 0.1,
  terminal_growth_rate: 0.02,
  exit_multiple: 10,
  total_debt: 50,
  cash: 20,
  shares_outstanding: 10,
}

function useDebounce<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}

function ChartShell({ title, description, accent, children }: { title: string; description?: string; accent: string; children: React.ReactNode }) {
  return (
    <div className='rounded-lg border border-border-subtle bg-bg-elevated p-5'>
      <div className='mb-4'>
        <div className='mb-1 flex items-center gap-2'>
          <span className={`h-2 w-2 rounded-full ${accent}`} />
          <h3 className='font-display text-[14px] text-text-primary'>{title}</h3>
        </div>
        {description ? <p className='font-ui text-[12px] text-text-secondary'>{description}</p> : null}
      </div>
      {children}
    </div>
  )
}

function blendRgb(from: [number, number, number], to: [number, number, number], ratio: number) {
  return from.map((value, index) => Math.round(value + (to[index] - value) * ratio)) as [number, number, number]
}

function heatColor(value: number, min: number, max: number) {
  const negative: [number, number, number] = [244, 63, 94]
  const neutral: [number, number, number] = [26, 26, 36]
  const positive: [number, number, number] = [16, 185, 129]

  if (value <= 0) {
    const ratio = min === 0 ? 1 : Math.min(1, Math.abs(value / min))
    const [r, g, b] = blendRgb(neutral, negative, ratio)
    return `rgb(${r}, ${g}, ${b})`
  }

  const ratio = max === 0 ? 1 : Math.min(1, value / max)
  const [r, g, b] = blendRgb(neutral, positive, ratio)
  return `rgb(${r}, ${g}, ${b})`
}

function SensitivityHeatmap({
  title,
  data,
  rowKey,
  currentColumn,
  currentRow,
  formatColumn,
  formatRow,
}: {
  title: string
  data: Array<Record<string, number>>
  rowKey: string
  currentColumn: string
  currentRow: number
  formatColumn: (value: string) => string
  formatRow: (value: number) => string
}) {
  if (!data.length) return null

  const columns = Object.keys(data[0]).filter((key) => key !== rowKey)
  const values = data.flatMap((row) => columns.map((column) => Number(row[column])))
  const min = Math.min(...values)
  const max = Math.max(...values)

  return (
    <ChartShell title={title} description='Terminal sensitivity around the current base case' accent='bg-accent-amber'>
      <div className='overflow-x-auto'>
        <table className='min-w-full border-separate border-spacing-1'>
          <thead>
            <tr>
              <th className='min-w-[92px] rounded-md bg-bg-elevated px-3 py-2 text-left font-ui text-[11px] uppercase tracking-[0.12em] text-text-secondary'>
                {rowKey}
              </th>
              {columns.map((column) => (
                <th key={column} className='min-w-[64px] rounded-md bg-bg-elevated px-3 py-2 text-center font-ui text-[11px] uppercase tracking-[0.12em] text-text-secondary'>
                  {formatColumn(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className='rounded-md bg-bg-elevated px-3 py-2 text-center font-ui text-[11px] uppercase tracking-[0.08em] text-text-secondary'>
                  {formatRow(Number(row[rowKey]))}
                </td>
                {columns.map((column) => {
                  const value = Number(row[column])
                  const active = column === currentColumn && Number(row[rowKey]) === currentRow
                  return (
                    <td key={column} className='p-0'>
                      <div
                        className={`flex h-9 min-w-[64px] items-center justify-center rounded-md border text-white transition duration-150 hover:scale-[1.02] hover:brightness-110 ${
                          active ? 'border-white border-2' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: heatColor(value, min, max) }}
                      >
                        <span className='font-mono text-[12px]'>${value.toFixed(2)}</span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className='mt-4 flex items-center gap-3'>
        <span className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-secondary'>More Dilutive</span>
        <div className='h-2 flex-1 rounded-full bg-[linear-gradient(90deg,var(--negative),var(--bg-overlay),var(--positive))]' />
        <span className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-secondary'>More Accretive</span>
      </div>
    </ChartShell>
  )
}

function CashFlowChart({ chartData }: { chartData: Array<Record<string, number | string>> }) {
  return (
    <ChartShell title='Cash Flow Projection' description='Revenue, EBITDA, and FCF with trend overlay' accent='bg-accent-violet'>
      <div className='h-[340px]'>
        <ResponsiveContainer width='100%' height='100%'>
          <ComposedChart data={chartData} margin={{ top: 24, right: 12, left: 8, bottom: 12 }}>
            <CartesianGrid vertical={false} stroke='var(--border-subtle)' strokeDasharray='4 4' />
            <XAxis
              dataKey='name'
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-display)' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickFormatter={(value) => `${Number(value).toFixed(0)}M`}
            />
            <RechartsTooltip
              cursor={{ fill: 'transparent' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                return (
                  <div className='rounded-lg border border-border-subtle bg-bg-surface px-3 py-2'>
                    <p className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>{label}</p>
                    {payload.map((entry) => (
                      <div key={entry.dataKey as string} className='flex items-center gap-2'>
                        <span className='h-2 w-2 rounded-full' style={{ backgroundColor: entry.color }} />
                        <span className='font-ui text-xs text-text-secondary'>{entry.name}</span>
                        <span className='font-mono text-xs text-text-primary'>${Number(entry.value).toFixed(1)}M</span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
            <Legend
              verticalAlign='bottom'
              align='center'
              wrapperStyle={{ fontFamily: 'var(--font-ui)', fontSize: '12px' }}
            />
            <Bar dataKey='Revenue' fill='var(--accent-cyan)' fillOpacity={0.6} radius={[6, 6, 0, 0]} maxBarSize={34}>
              <LabelList dataKey='growthLabel' position='top' style={{ fill: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }} />
            </Bar>
            <Bar dataKey='EBITDA' fill='var(--accent-violet)' fillOpacity={0.8} radius={[6, 6, 0, 0]} maxBarSize={28} />
            <Bar dataKey='FCF' fill='var(--accent-emerald)' radius={[6, 6, 0, 0]} maxBarSize={22} />
            <Line type='monotone' dataKey='FCF' stroke='rgba(240,240,248,0.75)' strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-emerald)' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  )
}

function Field({ label, name, value, onChange }: { label: string; name: keyof DcfForm; value: number; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className='space-y-2'>
      <Label className='text-label-sm'>{label}</Label>
      <Input
        type='number'
        step='any'
        name={name}
        value={value}
        onChange={onChange}
        className='border-border-subtle bg-bg-elevated font-mono text-text-primary'
      />
    </div>
  )
}

export default function DCFValuation() {
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const currentOrgId = useOrgStore((state) => state.currentOrg?.id ?? null)
  const { can } = usePermissions()
  const [formData, setFormData] = useState<DcfForm>(initialForm)
  const [results, setResults] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [companyLoading, setCompanyLoading] = useState(false)
  const [importedCompany, setImportedCompany] = useState<any>(null)
  const [modelName, setModelName] = useState('Base DCF Model')
  const [saving, setSaving] = useState(false)
  const [loadedModel, setLoadedModel] = useState<DcfModel | null>(null)
  const activeModelId = loadedModel?.id ?? new URLSearchParams(window.location.search).get('modelId')
  const debounced = useDebounce(formData, 300)

  useEffect(() => {
    if (debounced.shares_outstanding <= 0) return
    void calculate(debounced)
  }, [debounced])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const modelId = params.get('modelId')
    if (!modelId || !userId) return
    void loadSavedModel(modelId)
  }, [userId])

  async function calculate(payload: DcfForm) {
    setLoading(true)
    try {
      const response = await axios.post(apiUrl('/api/v1/modules/dcf/calculate'), payload)
      setResults(response.data)
      setInitialLoad(false)
    } catch (error) {
      toast.error('Calculation failed. Please check inputs.')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: Number.parseFloat(value) || 0,
    }))
  }

  async function handleTickerSelect(result: SearchResult) {
    setCompanyLoading(true)
    try {
      const company = await fetchCompanySnapshot(result.ticker)
      setImportedCompany(company)
      setModelName((current) => current === 'Base DCF Model' ? `${company.ticker} DCF` : current)
      setFormData((current) => ({
        ...current,
        revenue_base: company.revenueTtmM || current.revenue_base,
        ebitda_margins: company.revenueTtmM && company.ebitdaTtmM && company.revenueTtmM > 0
          ? company.ebitdaTtmM / company.revenueTtmM
          : current.ebitda_margins,
        exit_multiple: company.enterpriseValue && company.ebitdaTtmM && company.ebitdaTtmM > 0
          ? company.enterpriseValue / (company.ebitdaTtmM * 1_000_000)
          : current.exit_multiple,
        shares_outstanding: company.sharesOutstandingM || company.impliedSharesM || current.shares_outstanding,
      }))
    } finally {
      setCompanyLoading(false)
    }
  }

  async function loadSavedModel(modelId: string) {
    try {
      const { data, error } = await supabase
        .from('dcf_models')
        .select('*')
        .eq('id', modelId)
        .single()

      if (error) throw error
      if (!data) return

      setLoadedModel(data)
      setModelName(data.model_name)
      setImportedCompany(((data.model_data as Record<string, unknown> | null)?.importedCompany as Record<string, unknown> | null) ?? null)
      setFormData(dcfFormFromSavedModel(data))
      setResults((data.result_snapshot as Record<string, any> | null) ?? null)
      setInitialLoad(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load saved DCF model')
    }
  }

  async function handleSaveModel() {
    if (!userId) {
      toast.error('Sign in to save DCF models')
      return
    }
    if (!results) {
      toast.error('Run the model before saving')
      return
    }

    setSaving(true)
    try {
      const version = (await getCurrentDcfVersion(userId, modelName)) + 1
      const payload = buildDcfSavePayload(
        modelName,
        formData,
        results,
        importedCompany?.ticker ?? null,
        importedCompany ?? null,
        version
      )
      const { data, error } = await supabase
        .from('dcf_models')
        .insert({
          ...payload,
          user_id: userId,
          org_id: currentOrgId,
          visibility: currentOrgId ? 'org' : 'private',
          created_by: userId,
          last_edited_by: userId,
        } as never)
        .select('*')
        .single()

      if (error) throw error
      if (data) {
        await logActivity({
          orgId: currentOrgId,
          userId,
          action: 'dcf_model.created',
          resourceType: 'dcf_model',
          resourceId: data.id,
          metadata: { model_name: modelName, visibility: currentOrgId ? 'org' : 'private' },
        })
        setLoadedModel(data)
        window.history.replaceState({}, '', `/dcf?modelId=${data.id}`)
      }
      toast.success(`Saved ${modelName} v${version}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save DCF model')
    } finally {
      setSaving(false)
    }
  }

  const chartData = useMemo(() => {
    if (!results) return []
    return results.projected_years.map((year: number, index: number) => ({
      name: `Year ${year}`,
      Revenue: results.projected_revenues[index],
      EBITDA: results.projected_ebitda[index],
      FCF: results.projected_fcf[index],
      growthLabel: index === 0 ? `${(formData.revenue_growth * 100).toFixed(1)}%` : `${(((results.projected_revenues[index] / results.projected_revenues[index - 1]) - 1) * 100).toFixed(1)}%`,
    }))
  }, [formData.revenue_growth, results])

  const aiContext = {
    type: 'dcf' as const,
    data: {
      inputs: formData,
      results: results
        ? {
            intrinsicValue: results.share_price_pgm,
            enterpriseValue: results.enterprise_value_pgm,
            equityValue: results.equity_value_pgm,
            sharePriceEMM: results.share_price_emm,
          }
        : {},
    },
    summary: [
      { label: 'WACC', value: formData.wacc, type: 'percentage' as const },
      { label: 'T. Growth', value: formData.terminal_growth_rate, type: 'percentage' as const },
      { label: 'Value / Share', value: results?.share_price_pgm ?? 0, type: 'currency' as const },
      { label: 'Exit Mult', value: formData.exit_multiple, type: 'number' as const },
    ],
  }

  return (
    <div className='min-h-screen bg-bg-base'>
      <div className='space-y-8 p-6 md:p-8'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>QuantEdge / DCF Valuation</p>
            <h1 className='font-display text-4xl font-semibold tracking-[-0.03em] text-text-primary'>Discounted Cash Flow Workstation</h1>
            <p className='mt-2 max-w-2xl font-ui text-sm text-text-secondary'>Terminal growth and exit multiple valuation surfaces with a redesigned cash generation dashboard.</p>
          </div>
          <div className='flex items-center gap-3'>
            <ViewerPresence channelKey={activeModelId ? `deal:${activeModelId}` : null} />
            {loading && !initialLoad ? <RefreshCw className='mt-2 h-5 w-5 animate-spin text-text-secondary' /> : null}
            <Button onClick={() => void handleSaveModel()} disabled={saving || !can('deal.create')}>
              {saving ? <RefreshCw className='mr-2 h-4 w-4 animate-spin' /> : null}
              Save Model
            </Button>
          </div>
        </div>

        {loadedModel ? (
          <PremiumCard accentColor='primary' className='bg-accent-primary/5'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <p className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Loaded Model</p>
                <div className='mt-1 flex items-center gap-2'>
                  <span className='font-display text-lg text-text-primary'>{loadedModel.model_name}</span>
                  <span className='rounded-full border border-border-default px-2 py-1 font-mono text-[11px] text-text-secondary'>
                    v{safeNumber((loadedModel.model_data as Record<string, unknown> | null)?.version, 1)}
                  </span>
                </div>
                <p className='mt-2 font-ui text-sm text-text-secondary'>
                  Loaded {loadedModel.model_name} ({formatRelativeDate(loadedModel.created_at)})
                </p>
              </div>
            </div>
          </PremiumCard>
        ) : null}

        <div className='grid grid-cols-1 gap-8 xl:grid-cols-12'>
          <aside className='space-y-6 xl:col-span-3'>
              <PremiumCard accentColor='primary' className='overflow-visible border-accent-primary/20 bg-accent-primary/5'>
              <div className='space-y-3'>
                <div>
                  <h3 className='font-display text-lg text-text-primary'>Ticker Import</h3>
                  <p className='font-ui text-sm text-text-secondary'>Pull public market context into the DCF model.</p>
                </div>
                <TickerSearch placeholder='Search ticker or company' onSelect={(result) => void handleTickerSelect(result)} />
                {companyLoading ? <p className='font-ui text-xs text-text-secondary'>Loading company data...</p> : null}
              </div>
            </PremiumCard>
            {importedCompany ? <CompanyCard company={importedCompany} /> : null}
            <TickerNewsStrip ticker={importedCompany?.ticker} />
            <PremiumCard accentColor='cyan'>
              <div className='space-y-5'>
                <div>
                  <h3 className='font-display text-lg text-text-primary'>Operating Drivers</h3>
                  <p className='font-ui text-sm text-text-secondary'>Core growth and profitability assumptions feeding the five-year model.</p>
                </div>
                <div className='space-y-2'>
                  <Label className='text-label-sm'>Model Name</Label>
                  <Input value={modelName} onChange={(event) => setModelName(event.target.value)} className='border-border-subtle bg-bg-elevated text-text-primary' />
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <Field label='Base Revenue ($M)' name='revenue_base' value={formData.revenue_base} onChange={handleChange} />
                  <Field label='Revenue Growth' name='revenue_growth' value={formData.revenue_growth} onChange={handleChange} />
                  <Field label='EBITDA Margin' name='ebitda_margins' value={formData.ebitda_margins} onChange={handleChange} />
                  <Field label='Tax Rate' name='tax_rate' value={formData.tax_rate} onChange={handleChange} />
                </div>
              </div>
            </PremiumCard>

            <PremiumCard accentColor='violet'>
              <div className='space-y-5'>
                <div>
                  <h3 className='font-display text-lg text-text-primary'>Bridge and Terminal</h3>
                  <p className='font-ui text-sm text-text-secondary'>Capital structure and terminal assumptions for equity value translation.</p>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <Field label='Total Debt' name='total_debt' value={formData.total_debt} onChange={handleChange} />
                  <Field label='Cash' name='cash' value={formData.cash} onChange={handleChange} />
                  <Field label='Shares Out' name='shares_outstanding' value={formData.shares_outstanding} onChange={handleChange} />
                  <Field label='Exit Multiple' name='exit_multiple' value={formData.exit_multiple} onChange={handleChange} />
                </div>
              </div>
            </PremiumCard>

            <PremiumCard accentColor='primary'>
              <div className='space-y-5'>
                <div className='flex items-center gap-2'>
                  <TrendingUp className='h-4 w-4 text-accent-primary' />
                  <h3 className='font-display text-lg text-text-primary'>Live Sensitivities</h3>
                </div>
                <div className='space-y-5'>
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <Label className='text-label-sm'>WACC</Label>
                      <DataValue value={formData.wacc} type='percentage' size='sm' colorMode='default' precision={1} />
                    </div>
                    <PremiumSlider
                      min={2}
                      max={25}
                      step={0.5}
                      value={[formData.wacc * 100]}
                      onChange={(value) => setFormData((current) => ({ ...current, wacc: value[0] / 100 }))}
                      tickMarks={[{ value: 7.5 }, { value: 12.5 }, { value: 17.5 }]}
                      formatValue={(value) => `${value.toFixed(1)}%`}
                    />
                  </div>
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <Label className='text-label-sm'>Terminal Growth</Label>
                      <DataValue value={formData.terminal_growth_rate} type='percentage' size='sm' colorMode='default' precision={1} />
                    </div>
                    <PremiumSlider
                      min={0}
                      max={8}
                      step={0.5}
                      value={[formData.terminal_growth_rate * 100]}
                      onChange={(value) => setFormData((current) => ({ ...current, terminal_growth_rate: value[0] / 100 }))}
                      tickMarks={[{ value: 2 }, { value: 4 }, { value: 6 }]}
                      formatValue={(value) => `${value.toFixed(1)}%`}
                    />
                  </div>
                </div>
              </div>
            </PremiumCard>
          </aside>

          <main className='space-y-6 xl:col-span-9'>
            {loading && !results ? (
              <>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <MetricCardSkeleton key={index} />
                  ))}
                </div>
                <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                  <ChartSkeleton />
                  <HeatmapSkeleton />
                </div>
              </>
            ) : results ? (
              <>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
                  <MetricCard
                    label='Enterprise Value (PGM)'
                    value={results.enterprise_value_pgm}
                    valueType='currency'
                    accentColor='cyan'
                    secondaryInfo={`PV FCF ${results.sum_pv_fcf.toFixed(1)}M | PV TV ${results.pv_tv_pgm.toFixed(1)}M`}
                    precision={1}
                  />
                  <MetricCard
                    label='Equity Value (PGM)'
                    value={results.equity_value_pgm}
                    valueType='currency'
                    accentColor='violet'
                    secondaryInfo='Enterprise value plus cash less debt'
                    precision={1}
                  />
                  <MetricCard
                    label='Intrinsic Value / Share'
                    value={results.share_price_pgm}
                    valueType='currency'
                    accentColor='emerald'
                    secondaryInfo={`EMM cross-check ${results.share_price_emm.toFixed(2)} / share`}
                    badge='Target Price'
                    badgeColor='emerald'
                    precision={2}
                  />
                </div>

                <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                  <CashFlowChart chartData={chartData} />
                  <ChartShell title='Terminal Value Mix' description='Perpetuity growth vs exit multiple output' accent='bg-accent-primary'>
                    <div className='grid h-[340px] content-start gap-4'>
                      <div className='rounded-lg border border-border-subtle bg-bg-surface p-4'>
                        <p className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Perpetuity Growth Method</p>
                        <DataValue value={results.terminal_value_pgm} type='currency' size='xl' colorMode='default' precision={1} />
                        <p className='mt-2 font-ui text-sm text-text-secondary'>Discounted to {results.pv_tv_pgm.toFixed(1)}M present value.</p>
                      </div>
                      <div className='rounded-lg border border-border-subtle bg-bg-surface p-4'>
                        <p className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Exit Multiple Method</p>
                        <DataValue value={results.terminal_value_emm} type='currency' size='xl' colorMode='default' precision={1} />
                        <p className='mt-2 font-ui text-sm text-text-secondary'>Discounted to {results.pv_tv_emm.toFixed(1)}M present value.</p>
                      </div>
                    </div>
                  </ChartShell>
                </div>

                <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                  <SensitivityHeatmap
                    title='PGM Sensitivity (Price / Share)'
                    data={results.sensitivity_wacc_tgr || []}
                    rowKey='wacc'
                    currentColumn={String(formData.terminal_growth_rate)}
                    currentRow={formData.wacc}
                    formatColumn={(value) => `${(Number(value) * 100).toFixed(1)}%`}
                    formatRow={(value) => `${(value * 100).toFixed(1)}%`}
                  />
                  <SensitivityHeatmap
                    title='EMM Sensitivity (Price / Share)'
                    data={results.sensitivity_wacc_emm || []}
                    rowKey='wacc'
                    currentColumn={String(formData.exit_multiple)}
                    currentRow={formData.wacc}
                    formatColumn={(value) => `${Number(value).toFixed(1)}x`}
                    formatRow={(value) => `${(value * 100).toFixed(1)}%`}
                  />
                </div>
              </>
            ) : (
              <PremiumCard accentColor='cyan'>
                <div className='flex min-h-[420px] flex-col items-center justify-center gap-4 text-center'>
                  <div className='rounded-full border border-border-subtle bg-bg-elevated p-5'>
                    <Search className='h-8 w-8 text-text-muted' />
                  </div>
                  <div>
                    <h2 className='font-display text-2xl text-text-primary'>Initializing valuation engine</h2>
                    <p className='font-ui text-sm text-text-secondary'>Populate the DCF assumptions to price the business.</p>
                  </div>
                </div>
              </PremiumCard>
            )}
          </main>
        </div>
      </div>
      {can('ai.use') ? <AIChatPanel context={aiContext} relatedTicker={importedCompany?.ticker} /> : null}
    </div>
  )
}
