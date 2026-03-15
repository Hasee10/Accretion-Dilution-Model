import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataValue } from '@/components/ui/data-value'
import { FinanceColumn, FinanceTable } from '@/components/ui/finance-table'
import { TickerSearch } from '@/components/market/ticker-search'
import { fetchQuotes, SearchResult } from '@/lib/market/market-api'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

type WatchlistRow = {
  id: string
  user_id: string
  ticker: string
  company_name: string | null
  added_at: string
}

type WatchlistQuote = {
  ticker: string
  companyName: string
  price?: number | null
  changePercent?: number | null
  peRatio?: number | null
  marketCap?: number | null
}

export default function WatchlistPage() {
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const [items, setItems] = useState<WatchlistRow[]>([])
  const [quotes, setQuotes] = useState<Record<string, WatchlistQuote>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmTicker, setConfirmTicker] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    void loadWatchlist()
  }, [userId])

  async function loadWatchlist() {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase.from('watchlist').select('*').eq('user_id', userId).order('added_at', { ascending: false })
    const rows = (data || []) as WatchlistRow[]
    setItems(rows)
    if (rows.length) {
      const quoteRows = await fetchQuotes(rows.map((row) => row.ticker))
      setQuotes(Object.fromEntries(quoteRows.map((quote) => [quote.ticker, quote])))
    } else {
      setQuotes({})
    }
    setLoading(false)
  }

  async function refreshQuotes() {
    if (!items.length) return
    setRefreshing(true)
    const quoteRows = await fetchQuotes(items.map((row) => row.ticker))
    setQuotes(Object.fromEntries(quoteRows.map((quote) => [quote.ticker, quote])))
    setRefreshing(false)
  }

  async function addTicker(result: SearchResult) {
    if (!userId || items.length >= 20) return
    await supabase.from('watchlist').insert({
      user_id: userId,
      ticker: result.ticker,
      company_name: result.companyName,
    } as never)
    await loadWatchlist()
  }

  async function removeTicker(ticker: string) {
    if (!userId) return
    await supabase.from('watchlist').delete().eq('user_id', userId).eq('ticker', ticker)
    setConfirmTicker(null)
    await loadWatchlist()
  }

  const rows = useMemo(() => items.map((item) => ({ ...item, quote: quotes[item.ticker] })), [items, quotes])

  const columns: FinanceColumn<(typeof rows)[number]>[] = [
    { key: 'ticker', title: 'Ticker', sortable: true, render: (value) => <span className='font-mono text-sm font-semibold text-text-primary'>{String(value)}</span> },
    { key: 'company_name', title: 'Company', sortable: true },
    { key: 'quote', title: 'Price', render: (_value, row) => row.quote?.price ? <DataValue value={row.quote.price} type='currency' size='sm' /> : <span className='font-ui text-sm text-text-muted'>-</span> },
    { key: 'quote', title: 'Change%', render: (_value, row) => row.quote?.changePercent !== undefined ? <DataValue value={(row.quote.changePercent || 0) / 100} type='percentage' size='sm' colorMode='auto' precision={2} /> : <span className='font-ui text-sm text-text-muted'>-</span> },
    { key: 'quote', title: 'P/E', render: (_value, row) => row.quote?.peRatio ? <span className='font-mono text-sm text-text-primary'>{row.quote.peRatio.toFixed(1)}x</span> : <span className='font-ui text-sm text-text-muted'>-</span> },
    { key: 'quote', title: 'Market Cap', render: (_value, row) => row.quote?.marketCap ? <DataValue value={row.quote.marketCap} type='currency' size='sm' precision={0} /> : <span className='font-ui text-sm text-text-muted'>-</span> },
    { key: 'added_at', title: 'Added', sortable: true, type: 'date' },
    {
      key: 'ticker',
      title: 'Actions',
      render: (value) => {
        const ticker = String(value)
        if (confirmTicker === ticker) {
          return (
            <div className='flex items-center justify-end gap-2'>
              <button type='button' onClick={() => void removeTicker(ticker)} className='font-ui text-xs text-negative'>Confirm</button>
              <button type='button' onClick={() => setConfirmTicker(null)} className='font-ui text-xs text-text-secondary'>Cancel</button>
            </div>
          )
        }
        return (
          <button type='button' onClick={() => setConfirmTicker(ticker)} className='inline-flex items-center gap-1 font-ui text-xs text-text-secondary hover:text-negative'>
            <Trash2 className='h-3.5 w-3.5' /> Remove
          </button>
        )
      },
    },
  ]

  return (
    <div className='min-h-screen bg-bg-base'>
      <div className='space-y-8 p-6 md:p-8'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>QuantEdge / Watchlist</p>
            <h1 className='font-display text-4xl font-semibold tracking-[-0.03em] text-text-primary'>Market Watchlist</h1>
            <p className='mt-2 font-ui text-sm text-text-secondary'>Track up to 20 tickers with cached market data.</p>
          </div>
          <Button variant='outline' onClick={() => void refreshQuotes()} disabled={refreshing || !items.length} className='border-border-subtle bg-bg-surface hover:bg-bg-elevated'>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className='grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start'>
          <TickerSearch placeholder='Add ticker to watchlist' actionLabel='Add' onAction={(result) => void addTicker(result)} />
          <div className='rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 font-mono text-sm text-text-primary'>
            {items.length}/20
          </div>
        </div>

        <FinanceTable data={rows} columns={columns} loading={loading} emptyMessage='No watched tickers yet.' />
      </div>
    </div>
  )
}
