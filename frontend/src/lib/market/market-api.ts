import axios from 'axios'
import { apiUrl } from '@/lib/api'

export type SearchResult = {
  ticker: string
  companyName: string
  exchange?: string
  marketCap?: number | null
  logoUrl?: string | null
}

export type CompanySnapshot = {
  ticker: string
  companyName: string
  exchange: string
  price: number
  marketCap?: number | null
  impliedSharesM?: number
  sharesOutstandingM?: number | null
  sector?: string | null
  industry?: string | null
  beta?: number | null
  logoUrl?: string | null
  netIncomeM?: number | null
  revenueTtmM?: number | null
  ebitdaTtmM?: number | null
  eps?: number | null
  peRatio?: number | null
  enterpriseValue?: number | null
  yearLow?: number | null
  yearHigh?: number | null
  priceAvg50?: number | null
  changesPercentage?: number | null
  source: 'live' | 'cache'
  cacheAgeHours: number
  stale: boolean
  attributionUrl: string
}

export type QuoteSnapshot = {
  ticker: string
  companyName: string
  price?: number | null
  changePercent?: number | null
  peRatio?: number | null
  marketCap?: number | null
  source: 'live' | 'cache'
  cacheAgeHours: number
}

export async function searchTickers(query: string) {
  const response = await axios.get(apiUrl('/api/v1/market/search'), {
    params: { q: query },
  })
  return response.data as { results: SearchResult[]; source: 'live' | 'cache'; cacheAgeHours: number }
}

export async function fetchCompanySnapshot(ticker: string) {
  const response = await axios.get(apiUrl(`/api/v1/market/company/${ticker}`))
  return response.data as CompanySnapshot
}

export async function fetchQuotes(tickers: string[]) {
  if (!tickers.length) return []
  const response = await axios.get(apiUrl('/api/v1/market/quotes'), {
    params: { tickers: tickers.join(',') },
  })
  return response.data.quotes as QuoteSnapshot[]
}
