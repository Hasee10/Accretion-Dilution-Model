import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts'
import { RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DataValue } from '@/components/ui/data-value'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MetricCard } from '@/components/ui/metric-card'
import { PremiumCard } from '@/components/ui/premium-card'
import { PremiumSlider } from '@/components/ui/premium-slider'
import { MetricCardSkeleton } from '@/components/ui/skeleton'
import { CompanyCard } from '@/components/market/company-card'
import { TickerSearch } from '@/components/market/ticker-search'
import { ViewerPresence } from '@/components/collaboration/viewer-presence'
import { fetchCompanySnapshot, SearchResult } from '@/lib/market/market-api'
import { supabase } from '@/lib/supabase/client'
import { safeNumber } from '@/lib/deal-storage'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { usePermissions } from '@/hooks/use-permissions'
import { logActivity } from '@/lib/activity-log'
import { apiUrl } from '@/lib/api'

type LboForm = {
  entry_ev: number
  entry_ebitda: number
  exit_multiple: number
  hold_period: number
  debt_pct: number
  interest_rate: number
  ebitda_growth_rate: number
  revenue_at_entry: number
  management_fee_pct: number
}

const initialForm: LboForm = {
  entry_ev: 1200,
  entry_ebitda: 120,
  exit_multiple: 11,
  hold_period: 5,
  debt_pct: 0.6,
  interest_rate: 0.08,
  ebitda_growth_rate: 0.1,
  revenue_at_entry: 900,
  management_fee_pct: 0.02,
}

function useDebounce<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}

function ChartShell({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className='rounded-lg border border-border-subtle bg-bg-elevated p-5'>
      <div className='mb-4'>
        <div className='mb-1 flex items-center gap-2'>
          <span className='h-2 w-2 rounded-full bg-accent-primary' />
          <h3 className='font-display text-[14px] text-text-primary'>{title}</h3>
        </div>
        {description ? <p className='font-ui text-[12px] text-text-secondary'>{description}</p> : null}
      </div>
      {children}
    </div>
  )
}

function heatColor(value: number) {
  if (value < 15) return `color-mix(in srgb, var(--negative) ${Math.min(90, 40 + value * 2)}%, var(--bg-overlay))`
  if (value <= 25) return `color-mix(in srgb, var(--accent-amber) ${Math.min(90, 40 + value)}%, var(--bg-overlay))`
  return `color-mix(in srgb, var(--positive) ${Math.min(90, 45 + (value - 25) * 2)}%, var(--bg-overlay))`
}

function Field({ label, name, value, onChange }: { label: string; name: keyof LboForm; value: number; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void }) {
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

export default function LBOModelPage() {
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const currentOrgId = useOrgStore((state) => state.currentOrg?.id ?? null)
  const { can } = usePermissions()
  const [formData, setFormData] = useState<LboForm>(initialForm)
  const [results, setResults] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoad, setInitialLoad] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companyLoading, setCompanyLoading] = useState(false)
  const [importedCompany, setImportedCompany] = useState<any>(null)
  const [modelName, setModelName] = useState('LBO Quick Screen')
  const activeModelId = new URLSearchParams(window.location.search).get('modelId')
  const debounced = useDebounce(formData, 250)

  useEffect(() => {
    void calculate(debounced)
  }, [debounced])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const modelId = params.get('modelId')
    if (!modelId || !userId) return
    void loadSavedModel(modelId)
  }, [userId])

  async function calculate(payload: LboForm) {
    setLoading(true)
    try {
      const response = await axios.post(apiUrl('/api/v1/modules/lbo/calculate'), payload)
      setResults(response.data)
      setInitialLoad(false)
    } catch (error) {
      toast.error('LBO calculation failed. Please review the assumptions.')
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
      setModelName((current) => current === 'LBO Quick Screen' ? `${company.ticker} LBO` : current)
      setFormData((current) => ({
        ...current,
        entry_ev: company.enterpriseValue ? company.enterpriseValue / 1_000_000 : current.entry_ev,
        entry_ebitda: company.ebitdaTtmM || current.entry_ebitda,
        revenue_at_entry: company.revenueTtmM || current.revenue_at_entry,
        exit_multiple: company.enterpriseValue && company.ebitdaTtmM && company.ebitdaTtmM > 0
          ? company.enterpriseValue / (company.ebitdaTtmM * 1_000_000)
          : current.exit_multiple,
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

      const modelData = (data.model_data ?? {}) as Record<string, unknown>
      if (modelData.context !== 'lbo') return

      setModelName(data.model_name)
      setFormData({
        entry_ev: safeNumber(modelData.entry_ev, initialForm.entry_ev),
        entry_ebitda: safeNumber(modelData.entry_ebitda, initialForm.entry_ebitda),
        exit_multiple: safeNumber(modelData.exit_multiple, initialForm.exit_multiple),
        hold_period: safeNumber(modelData.hold_period, initialForm.hold_period),
        debt_pct: safeNumber(modelData.debt_pct, initialForm.debt_pct),
        interest_rate: safeNumber(modelData.interest_rate, initialForm.interest_rate),
        ebitda_growth_rate: safeNumber(modelData.ebitda_growth_rate, initialForm.ebitda_growth_rate),
        revenue_at_entry: safeNumber(modelData.revenue_at_entry, initialForm.revenue_at_entry),
        management_fee_pct: safeNumber(modelData.management_fee_pct, initialForm.management_fee_pct),
      })
      setResults((data.result_snapshot as Record<string, any> | null) ?? null)
      setInitialLoad(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load saved LBO model')
    }
  }

  async function handleSaveModel() {
    if (!userId) {
      toast.error('Sign in to save LBO models')
      return
    }
    if (!results) {
      toast.error('Run the LBO model before saving')
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('dcf_models')
        .insert({
          user_id: userId,
          model_name: modelName,
          ticker: null,
          model_data: {
            ...formData,
            context: 'lbo',
          },
          result_snapshot: results,
          is_public: false,
          org_id: currentOrgId,
          visibility: currentOrgId ? 'org' : 'private',
          created_by: userId,
          last_edited_by: userId,
        } as never)
        .select('id')
        .single()

      if (error) throw error
      if (data?.id) {
        await logActivity({
          orgId: currentOrgId,
          userId,
          action: 'lbo_model.created',
          resourceType: 'dcf_model',
          resourceId: data.id,
          metadata: { model_name: modelName, visibility: currentOrgId ? 'org' : 'private', context: 'lbo' },
        })
        window.history.replaceState({}, '', `/lbo-model?modelId=${data.id}`)
      }
      toast.success('LBO model saved')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save LBO model')
    } finally {
      setSaving(false)
    }
  }

  const entryMultiple = formData.entry_ebitda > 0 ? formData.entry_ev / formData.entry_ebitda : 0
  const metricTone = {
    moic: results?.moic > 2.5 ? 'positive' : results?.moic >= 1.5 ? 'warning' : 'negative',
    irr: results?.irr > 25 ? 'positive' : results?.irr >= 15 ? 'warning' : 'negative',
  } as const

  const debtWaterfallData = useMemo(() => {
    if (!results) return []
    return [
      { name: 'Entry', equity: results.entry_equity, debt: results.entry_debt },
      { name: 'Exit', equity: results.exit_equity, debt: results.remaining_debt },
    ]
  }, [results])

  const irrBridgeData = useMemo(() => {
    if (!results?.irr_bridge) return []
    return [
      { name: 'EBITDA Growth', value: safeNumber(results.irr_bridge.ebitda_growth) },
      { name: 'Multiple Expansion', value: safeNumber(results.irr_bridge.multiple_expansion) },
      { name: 'Debt Paydown', value: safeNumber(results.irr_bridge.debt_paydown) },
      { name: 'Management Fee Drag', value: safeNumber(results.irr_bridge.management_fee_drag) },
    ]
  }, [results])

  const sensitivityRows = useMemo(() => {
    if (!results?.sensitivity) return []
    const exitMultiples = Object.keys(results.sensitivity[String(formData.hold_period)] ?? results.sensitivity[formData.hold_period] ?? {}).map(Number)
    return exitMultiples.map((multiple) => {
      const row: Record<string, number> = { exit_multiple: multiple }
      for (const hold of [3, 4, 5, 6, 7]) {
        row[String(hold)] = safeNumber(results.sensitivity[String(hold)]?.[multiple] ?? results.sensitivity[hold]?.[multiple])
      }
      return row
    })
  }, [formData.hold_period, results])

  return (
    <div className='min-h-screen bg-bg-base'>
      <div className='space-y-8 p-6 md:p-8'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>QuantEdge / LBO Model</p>
            <h1 className='font-display text-4xl font-semibold tracking-[-0.03em] text-text-primary'>LBO Quick Model</h1>
            <p className='mt-2 max-w-2xl font-ui text-sm text-text-secondary'>Fast leveraged buyout screening with return drivers, debt paydown, and exit sensitivity.</p>
          </div>
          <div className='flex items-center gap-3'>
            <ViewerPresence channelKey={activeModelId ? `deal:${activeModelId}` : null} />
            {loading && !initialLoad ? <RefreshCw className='h-5 w-5 animate-spin text-text-secondary' /> : null}
            <Button onClick={() => void handleSaveModel()} disabled={saving || !can('deal.create')}>
              {saving ? <RefreshCw className='mr-2 h-4 w-4 animate-spin' /> : <Save className='mr-2 h-4 w-4' />}
              Save LBO
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-8 xl:grid-cols-12'>
          <aside className='space-y-6 xl:col-span-3'>
            <PremiumCard accentColor='primary' className='overflow-visible border-accent-primary/20 bg-accent-primary/5'>
              <div className='space-y-3'>
                <div>
                  <h3 className='font-display text-lg text-text-primary'>Ticker Import</h3>
                  <p className='font-ui text-sm text-text-secondary'>Pull public market context into the quick screen.</p>
                </div>
                <TickerSearch placeholder='Search ticker or company' onSelect={(result) => void handleTickerSelect(result)} />
                {companyLoading ? <p className='font-ui text-xs text-text-secondary'>Loading company data...</p> : null}
              </div>
            </PremiumCard>

            {importedCompany ? <CompanyCard company={importedCompany} /> : null}

            <PremiumCard accentColor='primary'>
              <div className='space-y-5'>
                <div>
                  <h3 className='font-display text-lg text-text-primary'>Model Control</h3>
                  <p className='font-ui text-sm text-text-secondary'>Name and manage the current quick screen.</p>
                </div>
                <div className='space-y-2'>
                  <Label className='text-label-sm'>Model Name</Label>
                  <Input value={modelName} onChange={(event) => setModelName(event.target.value)} className='border-border-subtle bg-bg-elevated text-text-primary' />
                </div>
              </div>
            </PremiumCard>

            <PremiumCard accentColor='cyan'>
              <div className='space-y-5'>
                <div>
                  <h3 className='font-display text-lg text-text-primary'>Entry Assumptions</h3>
                </div>
                <div className='grid grid-cols-1 gap-3'>
                  <Field label='Entry EV ($M)' name='entry_ev' value={formData.entry_ev} onChange={handleChange} />
                  <Field label='Entry EBITDA ($M)' name='entry_ebitda' value={formData.entry_ebitda} onChange={handleChange} />
                  <Field label='Revenue at Entry ($M)' name='revenue_at_entry' value={formData.revenue_at_entry} onChange={handleChange} />
                </div>
                <div className='rounded-lg border border-border-subtle bg-bg-elevated p-3'>
                  <p className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Derived Entry Multiple</p>
                  <p className='font-mono text-xl text-accent-cyan'>{entryMultiple.toFixed(1)}x</p>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-label-sm'>Debt % of EV</Label>
                    <DataValue value={formData.debt_pct} type='percentage' size='sm' />
                  </div>
                  <PremiumSlider
                    min={40}
                    max={80}
                    step={5}
                    value={[formData.debt_pct * 100]}
                    onChange={(value) => setFormData((current) => ({ ...current, debt_pct: value[0] / 100 }))}
                    tickMarks={[{ value: 40 }, { value: 60 }, { value: 80 }]}
                    formatValue={(value) => `${value.toFixed(0)}%`}
                  />
                </div>
              </div>
            </PremiumCard>

            <PremiumCard accentColor='violet'>
              <div className='space-y-5'>
                <div>
                  <h3 className='font-display text-lg text-text-primary'>Capital Structure</h3>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-label-sm'>Interest Rate</Label>
                    <DataValue value={formData.interest_rate} type='percentage' size='sm' />
                  </div>
                  <PremiumSlider
                    min={5}
                    max={15}
                    step={0.5}
                    value={[formData.interest_rate * 100]}
                    onChange={(value) => setFormData((current) => ({ ...current, interest_rate: value[0] / 100 }))}
                    tickMarks={[{ value: 5 }, { value: 10 }, { value: 15 }]}
                    formatValue={(value) => `${value.toFixed(1)}%`}
                  />
                </div>
                <div className='space-y-3'>
                  <Label className='text-label-sm'>Hold Period</Label>
                  <div className='grid grid-cols-5 gap-2'>
                    {[3, 4, 5, 6, 7].map((year) => (
                      <button
                        key={year}
                        type='button'
                        onClick={() => setFormData((current) => ({ ...current, hold_period: year }))}
                        className={`rounded-md border px-2 py-2 font-ui text-xs transition ${
                          formData.hold_period === year
                            ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                            : 'border-border-subtle bg-bg-elevated text-text-secondary'
                        }`}
                      >
                        {year}Y
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PremiumCard>

            <PremiumCard accentColor='emerald'>
              <div className='space-y-5'>
                <div>
                  <h3 className='font-display text-lg text-text-primary'>Value Creation</h3>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-label-sm'>Exit EV / EBITDA</Label>
                    <p className='font-mono text-sm text-text-primary'>{formData.exit_multiple.toFixed(1)}x</p>
                  </div>
                  <PremiumSlider
                    min={Math.max(1, entryMultiple - 3)}
                    max={entryMultiple + 3}
                    step={0.5}
                    value={[formData.exit_multiple]}
                    onChange={(value) => setFormData((current) => ({ ...current, exit_multiple: value[0] }))}
                    tickMarks={[{ value: Math.max(1, entryMultiple - 2) }, { value: entryMultiple }, { value: entryMultiple + 2 }]}
                    formatValue={(value) => `${value.toFixed(1)}x`}
                  />
                </div>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-label-sm'>Annual EBITDA Growth</Label>
                    <DataValue value={formData.ebitda_growth_rate} type='percentage' size='sm' />
                  </div>
                  <PremiumSlider
                    min={0}
                    max={25}
                    step={1}
                    value={[formData.ebitda_growth_rate * 100]}
                    onChange={(value) => setFormData((current) => ({ ...current, ebitda_growth_rate: value[0] / 100 }))}
                    tickMarks={[{ value: 5 }, { value: 15 }, { value: 25 }]}
                    formatValue={(value) => `${value.toFixed(0)}%`}
                  />
                </div>
              </div>
            </PremiumCard>

            <PremiumCard accentColor='amber'>
              <div className='space-y-5'>
                <div>
                  <h3 className='font-display text-lg text-text-primary'>Fees</h3>
                </div>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-label-sm'>Management Fee</Label>
                    <DataValue value={formData.management_fee_pct} type='percentage' size='sm' />
                  </div>
                  <PremiumSlider
                    min={1}
                    max={3}
                    step={0.25}
                    value={[formData.management_fee_pct * 100]}
                    onChange={(value) => setFormData((current) => ({ ...current, management_fee_pct: value[0] / 100 }))}
                    tickMarks={[{ value: 1 }, { value: 2 }, { value: 3 }]}
                    formatValue={(value) => `${value.toFixed(2)}%`}
                  />
                </div>
              </div>
            </PremiumCard>
          </aside>

          <main className='space-y-6 xl:col-span-9'>
            {loading && !results ? (
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
                {Array.from({ length: 4 }).map((_, index) => (
                  <MetricCardSkeleton key={index} />
                ))}
              </div>
            ) : null}

            {results ? (
              <>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
                  <MetricCard
                    label='MOIC'
                    value={results.moic}
                    valueType='number'
                    accentColor={metricTone.moic === 'positive' ? 'emerald' : metricTone.moic === 'warning' ? 'amber' : 'rose'}
                    secondaryInfo='Multiple of invested capital'
                    precision={2}
                  />
                  <MetricCard
                    label='IRR'
                    value={results.irr / 100}
                    valueType='percentage'
                    accentColor={metricTone.irr === 'positive' ? 'emerald' : metricTone.irr === 'warning' ? 'amber' : 'rose'}
                    secondaryInfo={`Fee drag ${results.fee_drag_on_irr.toFixed(1)} pts`}
                    precision={1}
                  />
                  <MetricCard
                    label='Entry Multiple'
                    value={results.entry_multiple}
                    valueType='number'
                    accentColor='cyan'
                    secondaryInfo='EV / EBITDA'
                    precision={1}
                  />
                  <MetricCard
                    label='Exit Equity'
                    value={results.exit_equity}
                    valueType='currency'
                    accentColor='primary'
                    secondaryInfo={`Remaining debt ${results.remaining_debt.toFixed(1)}M`}
                    precision={1}
                  />
                </div>

                <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
                  <ChartShell title='Debt Waterfall' description='Capital stack at entry versus exit'>
                    <div className='h-[320px]'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={debtWaterfallData} margin={{ top: 20, right: 12, left: 8, bottom: 12 }}>
                          <CartesianGrid vertical={false} stroke='var(--border-subtle)' strokeDasharray='4 4' />
                          <XAxis dataKey='name' axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-ui)' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }} tickFormatter={(value) => `${value}M`} />
                          <RechartsTooltip />
                          <Legend />
                          <Bar dataKey='equity' stackId='stack' fill='var(--accent-primary)' radius={[6, 6, 0, 0]} name='Equity' />
                          <Bar dataKey='debt' stackId='stack' fill='var(--negative)' fillOpacity={0.75} radius={[6, 6, 0, 0]} name='Debt / Remaining Debt' />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartShell>

                  <ChartShell title='IRR Bridge' description='High-level return drivers across the hold period'>
                    <div className='h-[320px]'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <BarChart data={irrBridgeData} layout='vertical' margin={{ top: 12, right: 24, left: 24, bottom: 12 }}>
                          <CartesianGrid horizontal={false} stroke='var(--border-subtle)' strokeDasharray='4 4' />
                          <XAxis type='number' axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }} tickFormatter={(value) => `${value}%`} />
                          <YAxis dataKey='name' type='category' axisLine={false} tickLine={false} width={120} tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-ui)' }} />
                          <RechartsTooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                          <Bar dataKey='value' radius={[0, 6, 6, 0]}>
                            <LabelList dataKey='value' position='right' formatter={(value: number) => `${value.toFixed(1)}%`} style={{ fill: 'var(--text-primary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }} />
                            {irrBridgeData.map((row) => (
                              <Cell key={row.name} fill={row.value >= 0 ? 'var(--accent-cyan)' : 'var(--negative)'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartShell>
                </div>

                <ChartShell title='Returns Sensitivity Matrix' description='IRR across hold periods and exit multiples'>
                  <div className='overflow-x-auto'>
                    <table className='min-w-full border-separate border-spacing-1'>
                      <thead>
                        <tr>
                          <th className='min-w-[92px] rounded-md bg-bg-elevated px-3 py-2 text-left font-ui text-[11px] uppercase tracking-[0.12em] text-text-secondary'>Exit Mult</th>
                          {[3, 4, 5, 6, 7].map((hold) => (
                            <th key={hold} className='min-w-[72px] rounded-md bg-bg-elevated px-3 py-2 text-center font-ui text-[11px] uppercase tracking-[0.12em] text-text-secondary'>
                              {hold}Y
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sensitivityRows.map((row) => (
                          <tr key={String(row.exit_multiple)}>
                            <td className='rounded-md bg-bg-elevated px-3 py-2 text-center font-mono text-[12px] text-text-primary'>
                              {safeNumber(row.exit_multiple).toFixed(1)}x
                            </td>
                            {[3, 4, 5, 6, 7].map((hold) => {
                              const value = safeNumber(row[String(hold)])
                              const active = hold === formData.hold_period && Number(row.exit_multiple).toFixed(1) === formData.exit_multiple.toFixed(1)
                              return (
                                <td key={hold} className='p-0'>
                                  <div
                                    className={`flex h-9 min-w-[72px] items-center justify-center rounded-md border text-white transition duration-150 hover:scale-[1.02] hover:brightness-110 ${
                                      active ? 'border-white border-2' : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: heatColor(value) }}
                                  >
                                    <span className='font-mono text-[12px]'>{value.toFixed(1)}%</span>
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ChartShell>
              </>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  )
}
