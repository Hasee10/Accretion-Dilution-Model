import { supabase } from '@/lib/supabase/client'
import type { Database, DcfModel, SavedDeal } from '@/lib/supabase/types'

export type MergerFormData = {
  name: string
  acq_net_income: number
  acq_shares: number
  acq_share_price: number
  tgt_net_income: number
  tgt_shares: number
  tgt_share_price: number
  offer_premium_pct: number
  cash_pct: number
  stock_pct: number
  debt_pct: number
  pre_tax_synergies: number
  interest_rate_debt: number
  cost_of_cash: number
  tax_rate: number
  cost_to_achieve: number
  new_da: number
}

export type DcfFormData = {
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

export type MergerSavedPayload = {
  version: number
  targetCompany: string
  purchasePrice: number
  dealMix: {
    cash: number
    stock: number
    debt: number
  }
  importedTicker?: string | null
  importedCompany?: Record<string, unknown> | null
  savedLabel?: string
} & MergerFormData

export type DcfSavedPayload = {
  version: number
  ticker?: string | null
  importedCompany?: Record<string, unknown> | null
  savedLabel?: string
} & DcfFormData

type JsonRecord = Record<string, unknown>

export function safeNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

export function getPurchasePrice(formData: Pick<MergerFormData, 'tgt_share_price' | 'tgt_shares' | 'offer_premium_pct'>) {
  return formData.tgt_share_price * formData.tgt_shares * (1 + formData.offer_premium_pct)
}

export function buildMergerSavePayload(
  formData: MergerFormData,
  resultSnapshot: JsonRecord | null,
  tags: string[],
  version: number,
  importedCompany?: Record<string, unknown> | null
): Database['public']['Tables']['saved_deals']['Insert'] {
  const targetCompany = typeof importedCompany?.companyName === 'string' ? importedCompany.companyName : formData.name
  const importedTicker = typeof importedCompany?.ticker === 'string' ? importedCompany.ticker : null
  const dealData: MergerSavedPayload = {
    ...formData,
    version,
    targetCompany,
    purchasePrice: getPurchasePrice(formData),
    dealMix: {
      cash: formData.cash_pct,
      stock: formData.stock_pct,
      debt: formData.debt_pct,
    },
    importedTicker,
    importedCompany: importedCompany ?? null,
    savedLabel: `${formData.name} v${version}`,
  }

  return {
    user_id: '',
    deal_name: formData.name,
    deal_data: dealData,
    result_snapshot: resultSnapshot,
    is_public: false,
    tags,
  }
}

export function buildDcfSavePayload(
  modelName: string,
  formData: DcfFormData,
  resultSnapshot: JsonRecord | null,
  ticker?: string | null,
  importedCompany?: Record<string, unknown> | null,
  version = 1
): Database['public']['Tables']['dcf_models']['Insert'] {
  const modelData: DcfSavedPayload = {
    ...formData,
    version,
    ticker: ticker ?? null,
    importedCompany: importedCompany ?? null,
    savedLabel: `${modelName} v${version}`,
  }

  return {
    user_id: '',
    model_name: modelName,
    ticker: ticker ?? null,
    model_data: modelData,
    result_snapshot: resultSnapshot,
    is_public: false,
  }
}

export async function getCurrentDealVersion(userId: string, dealName: string) {
  const { data, error } = await supabase
    .from('saved_deals')
    .select('deal_data')
    .eq('user_id', userId)
    .eq('deal_name', dealName)

  if (error) throw error

  return (data ?? []).reduce((max, row) => {
    const version = safeNumber((row.deal_data as JsonRecord | null)?.version, 0)
    return Math.max(max, version)
  }, 0)
}

export async function getCurrentDcfVersion(userId: string, modelName: string) {
  const { data, error } = await supabase
    .from('dcf_models')
    .select('model_data')
    .eq('user_id', userId)
    .eq('model_name', modelName)

  if (error) throw error

  return (data ?? []).reduce((max, row) => {
    const version = safeNumber((row.model_data as JsonRecord | null)?.version, 0)
    return Math.max(max, version)
  }, 0)
}

export function mergerFormFromSavedDeal(savedDeal: SavedDeal) {
  const payload = (savedDeal.deal_data ?? {}) as Partial<MergerSavedPayload>
  return {
    name: typeof payload.name === 'string' ? payload.name : savedDeal.deal_name,
    acq_net_income: safeNumber(payload.acq_net_income, 100),
    acq_shares: safeNumber(payload.acq_shares, 10),
    acq_share_price: safeNumber(payload.acq_share_price, 100),
    tgt_net_income: safeNumber(payload.tgt_net_income, 20),
    tgt_shares: safeNumber(payload.tgt_shares, 5),
    tgt_share_price: safeNumber(payload.tgt_share_price, 80),
    offer_premium_pct: safeNumber(payload.offer_premium_pct, 0.2),
    cash_pct: safeNumber(payload.cash_pct, 0),
    stock_pct: safeNumber(payload.stock_pct, 1),
    debt_pct: safeNumber(payload.debt_pct, 0),
    pre_tax_synergies: safeNumber(payload.pre_tax_synergies, 0),
    interest_rate_debt: safeNumber(payload.interest_rate_debt, 0.05),
    cost_of_cash: safeNumber(payload.cost_of_cash, 0.02),
    tax_rate: safeNumber(payload.tax_rate, 0.25),
    cost_to_achieve: safeNumber(payload.cost_to_achieve, 0),
    new_da: safeNumber(payload.new_da, 0),
  } satisfies MergerFormData
}

export function dcfFormFromSavedModel(model: DcfModel) {
  const payload = (model.model_data ?? {}) as Partial<DcfSavedPayload>
  return {
    revenue_base: safeNumber(payload.revenue_base, 100),
    revenue_growth: safeNumber(payload.revenue_growth, 0.1),
    ebitda_margins: safeNumber(payload.ebitda_margins, 0.2),
    tax_rate: safeNumber(payload.tax_rate, 0.21),
    wacc: safeNumber(payload.wacc, 0.1),
    terminal_growth_rate: safeNumber(payload.terminal_growth_rate, 0.02),
    exit_multiple: safeNumber(payload.exit_multiple, 10),
    total_debt: safeNumber(payload.total_debt, 50),
    cash: safeNumber(payload.cash, 20),
    shares_outstanding: safeNumber(payload.shares_outstanding, 10),
  } satisfies DcfFormData
}

export function formatRelativeDate(dateValue: string) {
  const date = new Date(dateValue)
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 30) return `${diffDays} days ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`
  const diffYears = Math.floor(diffMonths / 12)
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`
}
