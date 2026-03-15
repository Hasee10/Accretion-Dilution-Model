import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { PremiumCard } from '@/components/ui/premium-card'
import { MetricCard } from '@/components/ui/metric-card'
import { DataValue } from '@/components/ui/data-value'
import { PremiumSlider } from '@/components/ui/premium-slider'
import { MetricCardSkeleton, HeatmapSkeleton } from '@/components/ui/skeleton'
import { AIChatPanel } from '@/components/ai/ai-chat-panel'
import { CompanyCard } from '@/components/market/company-card'
import { TickerNewsStrip } from '@/components/news/ticker-news-strip'
import { TickerSearch } from '@/components/market/ticker-search'
import { ViewerPresence } from '@/components/collaboration/viewer-presence'
import { fetchCompanySnapshot, SearchResult } from '@/lib/market/market-api'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import type { SavedDeal } from '@/lib/supabase/types'
import { buildMergerSavePayload, formatRelativeDate, getCurrentDealVersion, mergerFormFromSavedDeal, safeNumber } from '@/lib/deal-storage'
import { usePermissions } from '@/hooks/use-permissions'
import { logActivity } from '@/lib/activity-log'
import { apiUrl } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { X } from 'lucide-react'
import { Loader2, Save, Check, UploadCloud, Search, TrendingUp, TrendingDown } from 'lucide-react'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  BarChart,
  Legend
} from 'recharts'
import { toast } from 'sonner'

// --- Hooks & Utilities ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-elevated border border-border-default rounded-lg p-3 shadow-lg">
        <p className="font-display text-sm font-medium text-text-primary mb-1">{label}</p>
        <DataValue 
          value={payload[0].value} 
          type="currency" 
          size="sm"
          className="text-text-primary"
        />
      </div>
    )
  }
  return null
}

// --- Enhanced EPS Bridge Chart ---
const EnhancedEPSBridge = React.memo(({ chartData }: { chartData: any[] }) => (
  <PremiumCard accentColor="cyan">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-accent-cyan rounded-full" />
          <h3 className="font-display text-sm font-medium text-text-primary">EPS Bridge</h3>
        </div>
        {chartData.length > 0 && (
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            chartData[1]?.value >= 0 
              ? 'bg-positive/20 text-positive border border-positive/30' 
              : 'bg-negative/20 text-negative border border-negative/30'
          }`}>
            {chartData[1]?.value >= 0 ? 'ACCRETIVE' : 'DILUTIVE'}
          </div>
        )}
      </div>
      <p className="font-ui text-xs text-text-secondary">Standalone to Pro-Forma EPS translation</p>
      
      <div className="h-[280px] min-h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={280}>
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <pattern id="diagonalStripes" patternUnits="userSpaceOnUse" width="4" height="4">
                <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
              </pattern>
            </defs>
            <CartesianGrid 
              strokeDasharray="1 2" 
              vertical={false} 
              stroke="var(--border-subtle)" 
            />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-ui)' }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }} 
              axisLine={false} 
              tickLine={false} 
              tickFormatter={(val) => `$${val}`}
            />
            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Bar dataKey="value" radius={[4, 4, 4, 4]}>
              {chartData.map((entry, index) => {
                if (entry.isBase) {
                  return <Cell key={`cell-${index}`} fill={index === 0 ? "var(--accent-cyan)" : "var(--accent-primary)"} opacity={0.8} />
                }
                const fillColor = entry.value >= 0 ? "var(--positive)" : "var(--negative)"
                return <Cell key={`cell-${index}`} fill={fillColor} stroke={fillColor} strokeWidth={1} />
              })}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  </PremiumCard>
))

// --- Enhanced Contribution Analysis ---
const EnhancedContribution = React.memo(({ data }: { data: any[] }) => (
  <PremiumCard accentColor="violet">
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-accent-violet rounded-full" />
        <h3 className="font-display text-sm font-medium text-text-primary">Contribution Analysis</h3>
      </div>
      <p className="font-ui text-xs text-text-secondary">Income vs Ownership comparison</p>
      
      <div className="h-[280px] min-h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={280}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="1 2" vertical={false} stroke="var(--border-subtle)" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-ui)' }}
              axisLine={false} 
              tickLine={false}
            />
            <YAxis 
              tickFormatter={(val: number) => `${(val * 100).toFixed(0)}%`} 
              tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false} 
              tickLine={false}
            />
            <RechartsTooltip 
              formatter={(val: any) => typeof val === 'number' ? `${(val * 100).toFixed(1)}%` : val}
              contentStyle={{ 
                backgroundColor: 'var(--bg-elevated)', 
                border: '1px solid var(--border-default)', 
                borderRadius: '8px',
                fontFamily: 'var(--font-ui)'
              }}
            />
            <Legend />
            <Bar dataKey="Income_Contribution" fill="var(--accent-primary)" name="NI Contribution" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Ownership" fill="var(--accent-violet)" name="Equity Ownership" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </PremiumCard>
))
// --- Enhanced Heatmap Component ---
const EnhancedHeatmap = React.memo(({ 
  data, 
  xKeys, 
  yKey, 
  title, 
  subtitle 
}: { 
  data: any[], 
  xKeys: string[], 
  yKey: string, 
  title: string, 
  subtitle: string 
}) => {
  if (!data || data.length === 0) return <HeatmapSkeleton />

  // Calculate color interpolation
  const allValues = data.flatMap(row => xKeys.map(k => row[k] as number))
  const minVal = Math.min(...allValues)
  const maxVal = Math.max(...allValues)
  const neutralVal = 0

  const getColor = (val: number) => {
    if (val === neutralVal) return 'var(--bg-overlay)'
    
    if (val < neutralVal) {
      const intensity = Math.abs(val - neutralVal) / Math.abs(minVal - neutralVal)
      return `color-mix(in srgb, var(--negative) ${Math.min(intensity * 100, 80)}%, var(--bg-overlay))`
    } else {
      const intensity = Math.abs(val - neutralVal) / Math.abs(maxVal - neutralVal)
      return `color-mix(in srgb, var(--positive) ${Math.min(intensity * 100, 80)}%, var(--bg-overlay))`
    }
  }

  return (
    <PremiumCard accentColor="emerald">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-accent-emerald rounded-full" />
          <h3 className="font-display text-sm font-medium text-text-primary">{title}</h3>
        </div>
        <p className="font-ui text-xs text-text-secondary">{subtitle}</p>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-3 bg-bg-elevated text-text-secondary font-ui font-medium uppercase tracking-wider text-left min-w-20">
                  {yKey.includes('premium') ? 'Premium' : yKey.includes('wacc') ? 'WACC' : 'Y \\ X'}
                </th>
                {xKeys.map(k => (
                  <th key={k} className="p-3 bg-bg-elevated text-text-secondary font-ui font-medium uppercase tracking-wider text-center min-w-16">
                    {k.replace('syn_', '').replace('rate_', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="p-3 font-mono text-text-primary bg-bg-elevated text-center font-medium">
                    <DataValue 
                      value={row[yKey]} 
                      type={yKey.includes('premium') || yKey.includes('change') ? 'percentage' : 'currency'} 
                      size="sm"
                    />
                  </td>
                  {xKeys.map(k => {
                    const val = row[k]
                    return (
                      <td
                        key={k}
                        className="p-3 text-center font-mono text-white font-medium transition-all duration-200 hover:brightness-110 hover:scale-105 cursor-pointer"
                        style={{ backgroundColor: getColor(val) }}
                      >
                        <DataValue value={val} type="percentage" size="sm" />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Color legend */}
        <div className="flex items-center justify-center space-x-4 pt-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-negative rounded-sm" />
            <span className="font-ui text-xs text-text-muted">More Dilutive</span>
          </div>
          <div className="w-16 h-1 bg-gradient-to-r from-negative via-bg-overlay to-positive rounded-full" />
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-positive rounded-sm" />
            <span className="font-ui text-xs text-text-muted">More Accretive</span>
          </div>
        </div>
      </div>
    </PremiumCard>
  )
})
// --- Enhanced Breakeven Slider ---
const EnhancedBreakevenSlider = React.memo(({ 
  currentSynergies, 
  breakevenSynergies, 
  onSynergyChange, 
  maxRange 
}: {
  currentSynergies: number
  breakevenSynergies: number
  onSynergyChange: (value: number[]) => void
  maxRange: number
}) => {
  const gap = currentSynergies - breakevenSynergies
  const isBuffer = gap > 0

  return (
    <PremiumCard accentColor="amber" className="border-dashed">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-display text-sm font-medium text-text-primary">Interactive Breakeven Finder</h4>
            <p className="font-ui text-xs text-text-secondary">Slide to see A/D impact dynamically</p>
          </div>
          <div className={`px-3 py-1 rounded-md text-xs font-medium ${
            isBuffer 
              ? 'bg-positive/20 text-positive border border-positive/30' 
              : 'bg-negative/20 text-negative border border-negative/30'
          }`}>
            {isBuffer ? (
              <div className="flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>BUFFER</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <TrendingDown className="w-3 h-3" />
                <span>SHORTFALL</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-ui text-xs text-text-muted">Current Synergies:</span>
              <DataValue value={currentSynergies} type="currency" size="sm" className="ml-2" />
            </div>
            <div>
              <span className="font-ui text-xs text-text-muted">Required for Breakeven:</span>
              <DataValue value={breakevenSynergies} type="currency" size="sm" className="ml-2" />
            </div>
          </div>

          <PremiumSlider
            min={0}
            max={maxRange}
            value={[currentSynergies]}
            onChange={onSynergyChange}
            step={0.1}
            tickMarks={[
              { value: maxRange * 0.25, label: '25%' },
              { value: maxRange * 0.5, label: '50%' },
              { value: maxRange * 0.75, label: '75%' },
              { value: breakevenSynergies, label: 'BE' }
            ]}
            formatValue={(val) => `$${val.toFixed(1)}M`}
          />

          <div className="text-center">
            <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg ${
              isBuffer ? 'bg-positive/10' : 'bg-negative/10'
            }`}>
              <span className="font-ui text-xs text-text-muted">
                {isBuffer ? 'You have' : 'You need'}
              </span>
              <DataValue 
                value={Math.abs(gap)} 
                type="currency" 
                size="sm" 
                colorMode={isBuffer ? 'positive' : 'negative'}
              />
              <span className="font-ui text-xs text-text-muted">
                {isBuffer ? 'BUFFER' : 'MORE'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PremiumCard>
  )
})
// --- Main Component ---
const mergerTagSuggestions = ['Accretive', 'Dilutive', 'All-Stock', 'All-Cash', 'Leveraged', 'Cross-Border']

export default function MergerAnalysisPremium() {
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const currentOrgId = useOrgStore((state) => state.currentOrg?.id ?? null)
  const { can } = usePermissions()
  const [formData, setFormData] = useState({
    name: "Project Omega",
    acq_net_income: 100,
    acq_shares: 10,
    acq_share_price: 100,
    tgt_net_income: 20,
    tgt_shares: 5,
    tgt_share_price: 80,
    offer_premium_pct: 0.20,
    cash_pct: 0.0,
    stock_pct: 1.0,
    debt_pct: 0.0,
    pre_tax_synergies: 0.0,
    interest_rate_debt: 0.05,
    cost_of_cash: 0.02,
    tax_rate: 0.25,
    cost_to_achieve: 0.0,
    new_da: 0.0
  })

  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [companyLoading, setCompanyLoading] = useState(false)
  const [importedCompany, setImportedCompany] = useState<any>(null)
  const [sliderSynergy, setSliderSynergy] = useState([formData.pre_tax_synergies])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [dealTags, setDealTags] = useState<string[]>([])
  const [loadedDeal, setLoadedDeal] = useState<SavedDeal | null>(null)
  const [loadingSavedDeal, setLoadingSavedDeal] = useState(false)
  const [editingLoadedDeal, setEditingLoadedDeal] = useState(false)
  const activeDealId = loadedDeal?.id ?? new URLSearchParams(window.location.search).get('dealId')

  const debouncedData = useDebounce(formData, 300)

  useEffect(() => {
    void runModel(debouncedData)
  }, [debouncedData])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const dealId = params.get('dealId')
    if (!dealId || !userId) return
    void loadSavedDeal(dealId)
  }, [userId])

  const runModel = async (payload: any) => {
    if (Math.abs(payload.cash_pct + payload.stock_pct + payload.debt_pct - 1.0) > 0.001) return

    setLoading(true)
    try {
      const resp = await axios.post(apiUrl('/api/v1/modules/accretion_dilution'), payload)
      setResults(resp.data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail?.[0]?.msg || err.message || 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'name' ? value : (parseFloat(value) || 0)
    }))
  }

  const handleSliderChange = (val: number[]) => {
    setSliderSynergy(val)
    setFormData(prev => ({ ...prev, pre_tax_synergies: val[0] }))
  }

  const addTag = (rawTag: string) => {
    const normalized = rawTag.trim()
    if (!normalized) return
    setDealTags((current) => (current.includes(normalized) ? current : [...current, normalized]))
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setDealTags((current) => current.filter((entry) => entry !== tag))
  }

  const loadSavedDeal = async (dealId: string) => {
    setLoadingSavedDeal(true)
    try {
      const { data, error } = await supabase
        .from('saved_deals')
        .select('*')
        .eq('id', dealId)
        .single()

      if (error) throw error
      if (!data) return

      setLoadedDeal(data)
      setEditingLoadedDeal(false)
      setFormData(mergerFormFromSavedDeal(data))
      setSliderSynergy([safeNumber((data.deal_data as Record<string, unknown> | null)?.pre_tax_synergies, 0)])
      setImportedCompany(((data.deal_data as Record<string, unknown> | null)?.importedCompany as Record<string, unknown> | null) ?? null)
      setDealTags(data.tags ?? [])
      setResults((data.result_snapshot as any) ?? null)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load saved deal')
    } finally {
      setLoadingSavedDeal(false)
    }
  }

  const persistDeal = async (versionOverride?: number) => {
    if (!userId) {
      toast.error('Sign in to save deals')
      return
    }

    setSaving(true)
    setSaveSuccess(false)
    try {
      const currentVersion = versionOverride ?? (
        loadedDeal
          ? safeNumber((loadedDeal.deal_data as Record<string, unknown> | null)?.version, 1)
          : (await getCurrentDealVersion(userId, formData.name)) + 1
      )

      const payload = buildMergerSavePayload(
        formData,
        results ? { ...results } : null,
        dealTags,
        currentVersion,
        importedCompany
      )

      if (loadedDeal && versionOverride === undefined) {
        const { error } = await supabase
          .from('saved_deals')
          .update({
            deal_name: payload.deal_name,
            deal_data: payload.deal_data,
            result_snapshot: payload.result_snapshot,
            tags: payload.tags,
            org_id: currentOrgId,
            visibility: currentOrgId ? 'org' : 'private',
            last_edited_by: userId,
          } as never)
          .eq('id', loadedDeal.id)

        if (error) throw error
        await logActivity({
          orgId: currentOrgId,
          userId,
          action: 'deal.updated',
          resourceType: 'deal',
          resourceId: loadedDeal.id,
          metadata: { deal_name: payload.deal_name, visibility: currentOrgId ? 'org' : 'private' },
        })
      } else {
        const { data, error } = await supabase
          .from('saved_deals')
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
            action: 'deal.created',
            resourceType: 'deal',
            resourceId: data.id,
            metadata: { deal_name: payload.deal_name, visibility: currentOrgId ? 'org' : 'private' },
          })
          setLoadedDeal(data)
          window.history.replaceState({}, '', `/merger-analysis?dealId=${data.id}`)
        }
      }

      setSaveSuccess(true)
      setEditingLoadedDeal(false)
      setSaveDialogOpen(false)
      toast.success(versionOverride ? `Saved ${formData.name} v${versionOverride}` : 'Deal saved')
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDeal = async () => {
    if (!results) {
      toast.error('Run the model before saving')
      return
    }
    await persistDeal()
  }

  const handleSaveNewVersion = async () => {
    if (!userId) {
      toast.error('Sign in to save versions')
      return
    }
    const nextVersion = (await getCurrentDealVersion(userId, formData.name)) + 1
    await persistDeal(nextVersion)
  }

  const mixSum = Number((formData.cash_pct + formData.stock_pct + formData.debt_pct).toFixed(4))
  const isMixValid = mixSum === 1.0

  // Chart Data Preparation
  let chartData: any[] = []
  let contributionData: any[] = []
  let synPremXKeys: string[] = []
  let priceDebtXKeys: string[] = []
  const aiContext = {
    type: 'merger' as const,
    data: {
      inputs: formData,
      results: results
        ? {
            adPct: Number((results['Accretion/Dilution Percentage'] * 100).toFixed(1)),
            proFormaEPS: results['Pro-Forma EPS'],
            breakevenSynergies: results['Breakeven Synergies'],
            standaloneEPS: results['Standalone EPS'],
          }
        : {},
    },
    summary: [
      {
        label: 'A/D',
        value: results?.['Accretion/Dilution Percentage'] ?? 0,
        type: 'percentage' as const,
      },
      {
        label: 'EPS',
        value: results?.['Pro-Forma EPS'] ?? 0,
        type: 'currency' as const,
      },
      {
        label: 'Synergies',
        value: formData.pre_tax_synergies,
        type: 'currency' as const,
      },
      {
        label: 'Premium',
        value: formData.offer_premium_pct,
        type: 'percentage' as const,
      },
    ],
  }

  const handleTickerSelect = async (result: SearchResult) => {
    setCompanyLoading(true)
    try {
      const company = await fetchCompanySnapshot(result.ticker)
      const sharesOutstanding = company.sharesOutstandingM || company.impliedSharesM
      const netIncome = company.netIncomeM || (company.eps && sharesOutstanding ? company.eps * sharesOutstanding : null)
      setImportedCompany(company)
      setFormData((prev) => ({
        ...prev,
        name: company.companyName || prev.name,
        tgt_share_price: company.price || prev.tgt_share_price,
        tgt_shares: sharesOutstanding || prev.tgt_shares,
        tgt_net_income: netIncome || prev.tgt_net_income,
      }))
    } finally {
      setCompanyLoading(false)
    }
  }

  const addImportedToWatchlist = async () => {
    if (!userId || !importedCompany) return
    await supabase.from('watchlist').upsert({
      user_id: userId,
      ticker: importedCompany.ticker,
      company_name: importedCompany.companyName,
    } as never, { onConflict: 'user_id,ticker' })
    toast.success('Added to watchlist')
  }

  if (results) {
    const startEps = results['Standalone EPS']
    const proFormaEps = results['Pro-Forma EPS']
    const diff = results['Accretion/Dilution Amount']

    chartData = [
      { name: 'Standalone EPS', value: startEps, isBase: true },
      { name: 'A/D Impact', value: diff, isBase: false },
      { name: 'Pro-Forma EPS', value: proFormaEps, isBase: true }
    ]

    const totalNI = formData.acq_net_income + formData.tgt_net_income
    contributionData = [
      {
        name: 'Acquirer',
        Income_Contribution: formData.acq_net_income / totalNI,
        Ownership: results['Acquirer Ownership %']
      },
      {
        name: 'Target',
        Income_Contribution: formData.tgt_net_income / totalNI,
        Ownership: results['Target Ownership %']
      }
    ]

    if (results.sensitivity_synergy_premium?.length > 0) {
      synPremXKeys = Object.keys(results.sensitivity_synergy_premium[0]).filter(k => k !== 'premium')
    }

    if (results.sensitivity_price_debt?.length > 0) {
      priceDebtXKeys = Object.keys(results.sensitivity_price_debt[0]).filter(k => k !== 'price_change' && k !== 'purchase_price')
    }
  }

  const ruleOfThumbActive = results?.acq_pe && results?.effective_tgt_pe && results.acq_pe > results.effective_tgt_pe
  return (
    <div className="min-h-screen bg-bg-base">
      <div className="p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-text-primary tracking-tight">Merger Analysis</h1>
            <p className="font-ui text-text-secondary pt-1">Accretion / Dilution Engine & Sensitivity Suite</p>
          </div>
          <ViewerPresence channelKey={activeDealId ? `deal:${activeDealId}` : null} />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSaveDialogOpen(true)}
            disabled={saving || saveSuccess || !can('deal.create')}
            className="bg-bg-surface border-border-default hover:bg-bg-elevated"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : saveSuccess ? <Check className="mr-2 h-4 w-4 text-positive" /> : <Save className="mr-2 h-4 w-4" />}
            {saveSuccess ? 'Saved' : 'Save Deal'}
          </Button>
        </div>

        {loadedDeal ? (
          <PremiumCard accentColor='primary' className='bg-accent-primary/5'>
            <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
              <div>
                <p className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Loaded Deal</p>
                <div className='mt-1 flex flex-wrap items-center gap-2'>
                  <span className='font-display text-lg text-text-primary'>{loadedDeal.deal_name}</span>
                  <span className='rounded-full border border-border-default px-2 py-1 font-mono text-[11px] text-text-secondary'>
                    v{safeNumber((loadedDeal.deal_data as Record<string, unknown> | null)?.version, 1)}
                  </span>
                </div>
                <p className='mt-2 font-ui text-sm text-text-secondary'>
                  Loaded {loadedDeal.deal_name} ({formatRelativeDate(loadedDeal.created_at)}) {loadingSavedDeal ? '...' : ''} -
                  {editingLoadedDeal ? ' editing loaded scenario' : ' ready to revise or version'}
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button variant='outline' size='sm' className='border-border-default bg-bg-surface' onClick={() => setEditingLoadedDeal(true)}>
                  Edit
                </Button>
                <Button variant='outline' size='sm' className='border-border-default bg-bg-surface' onClick={() => void handleSaveNewVersion()}>
                  Save New Version
                </Button>
              </div>
            </div>
          </PremiumCard>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Column: Inputs */}
          <div className="xl:col-span-3 space-y-6">
            {/* Quick Import */}
            <PremiumCard accentColor="primary" className="overflow-visible border-accent-primary/20 bg-accent-primary/5">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-accent-primary" />
                  <h3 className="font-display text-sm font-medium text-text-primary">Quick Target Import</h3>
                </div>
                <TickerSearch placeholder="Search target ticker or company" onSelect={(result) => void handleTickerSelect(result)} />
                {companyLoading ? <p className="font-ui text-xs text-text-secondary">Loading company data...</p> : null}
              </div>
            </PremiumCard>
            {importedCompany ? <CompanyCard company={importedCompany} onAddToWatchlist={addImportedToWatchlist} /> : null}
            <TickerNewsStrip ticker={importedCompany?.ticker} />

            {/* Deal Assumptions */}
            <PremiumCard accentColor="cyan">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-accent-cyan rounded-full" />
                    <h3 className="font-display text-lg font-medium text-text-primary">Deal Assumptions</h3>
                  </div>
                  <UploadCloud className="w-5 h-5 text-text-muted" />
                </div>
                <p className="font-ui text-xs text-text-secondary">Drag & drop CSV to auto-fill</p>
                
                <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Deal Name */}
                  <div className="space-y-2">
                    <Label className="text-label-sm">Deal Name</Label>
                    <Input 
                      type="text" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleChange}
                      className="bg-bg-elevated border-border-default text-text-primary"
                    />
                  </div>

                  {/* Acquirer Section */}
                  <div className="space-y-3">
                    <h4 className="text-label-sm text-accent-primary">Acquirer</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-label-sm">Net Income (M)</Label>
                        <Input 
                          type="number" 
                          step="any" 
                          name="acq_net_income" 
                          value={formData.acq_net_income} 
                          onChange={handleChange}
                          className="bg-bg-elevated border-border-default text-text-primary font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-label-sm">Shares (M)</Label>
                        <Input 
                          type="number" 
                          step="any" 
                          name="acq_shares" 
                          value={formData.acq_shares} 
                          onChange={handleChange}
                          className="bg-bg-elevated border-border-default text-text-primary font-mono"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-label-sm">Share Price ($)</Label>
                        <Input 
                          type="number" 
                          step="any" 
                          name="acq_share_price" 
                          value={formData.acq_share_price} 
                          onChange={handleChange}
                          className="bg-bg-elevated border-border-default text-text-primary font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Target Section */}
                  <div className="space-y-3">
                    <h4 className="text-label-sm text-accent-violet">Target</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-label-sm">Net Income (M)</Label>
                        <Input 
                          type="number" 
                          step="any" 
                          name="tgt_net_income" 
                          value={formData.tgt_net_income} 
                          onChange={handleChange}
                          className="bg-bg-elevated border-border-default text-text-primary font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-label-sm">Shares (M)</Label>
                        <Input 
                          type="number" 
                          step="any" 
                          name="tgt_shares" 
                          value={formData.tgt_shares} 
                          onChange={handleChange}
                          className="bg-bg-elevated border-border-default text-text-primary font-mono"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-label-sm">Share Price ($)</Label>
                        <Input 
                          type="number" 
                          step="any" 
                          name="tgt_share_price" 
                          value={formData.tgt_share_price} 
                          onChange={handleChange}
                          className="bg-bg-elevated border-border-default text-text-primary font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Deal Mechanics */}
                  <div className="space-y-3">
                    <h4 className="text-label-sm text-accent-emerald">Deal Mechanics</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-label-sm">Offer Premium (%)</Label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          name="offer_premium_pct" 
                          value={formData.offer_premium_pct} 
                          onChange={handleChange}
                          className="bg-bg-elevated border-border-default text-text-primary font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-label-sm">% Cash</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          max="1" 
                          step="0.01" 
                          name="cash_pct" 
                          value={formData.cash_pct} 
                          onChange={handleChange}
                          className="bg-bg-elevated border-border-default text-text-primary font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-label-sm">% Stock</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          max="1" 
                          step="0.01" 
                          name="stock_pct" 
                          value={formData.stock_pct} 
                          onChange={handleChange}
                          className="bg-bg-elevated border-border-default text-text-primary font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-label-sm">% Debt</Label>
                        <Input 
                          type="number" 
                          min="0" 
                          max="1" 
                          step="0.01" 
                          name="debt_pct" 
                          value={formData.debt_pct} 
                          onChange={handleChange}
                          className="bg-bg-elevated border-border-default text-text-primary font-mono"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-label-sm">Pre-tax Synergies (M)</Label>
                        <Input 
                          type="number" 
                          step="any" 
                          name="pre_tax_synergies" 
                          value={formData.pre_tax_synergies} 
                          onChange={handleChange}
                          className="bg-bg-elevated border-border-default text-text-primary font-mono"
                        />
                      </div>
                    </div>
                    
                    {!isMixValid && (
                      <div className="mt-2 text-xs font-medium text-negative">
                        Expected sum 1.0. Current: {mixSum}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </PremiumCard>
          </div>
          {/* Right Column: Results */}
          <div className="xl:col-span-9 space-y-6">
            {loading && !results ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <MetricCardSkeleton key={i} />
                ))}
              </div>
            ) : results ? (
              <div className="space-y-6">
                {/* Top Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    label="Main A/D (Year 3)"
                    value={results['Accretion/Dilution Percentage']}
                    valueType="percentage"
                    colorMode="auto"
                    secondaryInfo={`${results['Accretion/Dilution Amount'] >= 0 ? '+' : ''}$${results['Accretion/Dilution Amount'].toFixed(2)} per share`}
                    badge={results['Accretion/Dilution Percentage'] >= 0 ? 'ACCRETIVE' : 'DILUTIVE'}
                    badgeColor={results['Accretion/Dilution Percentage'] >= 0 ? 'emerald' : 'rose'}
                    accentColor={results['Accretion/Dilution Percentage'] >= 0 ? 'emerald' : 'rose'}
                    precision={1}
                  />

                  <MetricCard
                    label="Pro-Forma EPS"
                    value={results['Pro-Forma EPS']}
                    valueType="currency"
                    accentColor="primary"
                    precision={2}
                  />

                  <MetricCard
                    label="P/E Comparison"
                    value={results.acq_pe}
                    valueType="number"
                    secondaryInfo={`vs ${results.effective_tgt_pe?.toFixed(1)}x Target (Effective)`}
                    badge={ruleOfThumbActive ? 'Rule Met' : undefined}
                    badgeColor="primary"
                    accentColor={ruleOfThumbActive ? 'primary' : 'amber'}
                    precision={1}
                  />

                  <MetricCard
                    label="Breakeven Synergies"
                    value={results['Breakeven Synergies']}
                    valueType="currency"
                    accentColor="amber"
                    precision={1}
                  />
                </div>

                {/* Breakeven Slider */}
                <EnhancedBreakevenSlider
                  currentSynergies={sliderSynergy[0]}
                  breakevenSynergies={results['Breakeven Synergies']}
                  onSynergyChange={handleSliderChange}
                  maxRange={Math.max(results['Breakeven Synergies'] * 2, 100)}
                />

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <EnhancedEPSBridge chartData={chartData} />
                  <EnhancedContribution data={contributionData} />
                </div>

                {/* Sensitivity Matrices */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <EnhancedHeatmap
                    title="Synergy vs. Premium"
                    subtitle="A/D Impact matrix (Synergy % vs Premium %)"
                    data={results.sensitivity_synergy_premium || []}
                    xKeys={synPremXKeys}
                    yKey="premium"
                  />
                  <EnhancedHeatmap
                    title="Rate vs. Purchase Price"
                    subtitle="A/D Impact matrix (Rate Change vs Purchase Price)"
                    data={results.sensitivity_price_debt || []}
                    xKeys={priceDebtXKeys}
                    yKey="purchase_price"
                  />
                </div>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center">
                <PremiumCard className="border-dashed border-border-default">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-text-muted" />
                    </div>
                    <p className="font-ui text-text-secondary">Input assumptions to generate model</p>
                  </div>
                </PremiumCard>
              </div>
            )}
          </div>
        </div>
      </div>
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className='border-border-default bg-bg-surface text-text-primary sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle className='font-display text-xl text-text-primary'>Save Deal Snapshot</DialogTitle>
            <DialogDescription className='font-ui text-sm text-text-secondary'>
              Save the current merger case with tags so it can be reopened and compared from History.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label className='text-label-sm'>Deal Name</Label>
              <Input
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                className='border-border-default bg-bg-elevated text-text-primary'
              />
            </div>

            <div className='space-y-2'>
              <Label className='text-label-sm'>Tags</Label>
              <Input
                value={tagInput}
                placeholder='Type a tag and press Enter'
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    addTag(tagInput)
                  }
                }}
                className='border-border-default bg-bg-elevated text-text-primary'
              />
              <div className='flex flex-wrap gap-2'>
                {dealTags.map((tag) => (
                  <button
                    key={tag}
                    type='button'
                    onClick={() => removeTag(tag)}
                    className='inline-flex items-center gap-1 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-2 py-1 font-ui text-xs text-accent-primary'
                  >
                    {tag}
                    <X className='h-3 w-3' />
                  </button>
                ))}
              </div>
              <div className='flex flex-wrap gap-2'>
                {mergerTagSuggestions.map((tag) => (
                  <button
                    key={tag}
                    type='button'
                    onClick={() => addTag(tag)}
                    className='rounded-full border border-border-subtle bg-bg-elevated px-2 py-1 font-ui text-[11px] text-text-secondary transition hover:border-border-default hover:text-text-primary'
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' className='border-border-default bg-bg-elevated' onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveDeal()} disabled={saving || !results}>
              {saving ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Save className='mr-2 h-4 w-4' />}
              Save Deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {can('ai.use') ? <AIChatPanel context={aiContext} relatedTicker={importedCompany?.ticker} /> : null}
    </div>
  )
}
