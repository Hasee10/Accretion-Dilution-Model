import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Plus, Search } from 'lucide-react'
import { DataValue } from '@/components/ui/data-value'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { SearchResult, searchTickers } from '@/lib/market/market-api'

export function TickerSearch({
  placeholder = 'Search ticker or company',
  onSelect,
  actionLabel,
  onAction,
}: {
  placeholder?: string
  onSelect?: (result: SearchResult) => void
  actionLabel?: string
  onAction?: (result: SearchResult) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setOpen(false)
      return
    }

    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const payload = await searchTickers(query)
        setResults(payload.results)
        setOpen(true)
        setActiveIndex(0)
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const visibleResults = useMemo(() => results.slice(0, 10), [results])

  return (
    <div ref={rootRef} className='relative'>
      <div className='relative'>
        <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted' />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(visibleResults.length > 0)}
          onKeyDown={(event) => {
            if (!open || !visibleResults.length) return
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActiveIndex((current) => Math.min(current + 1, visibleResults.length - 1))
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActiveIndex((current) => Math.max(current - 1, 0))
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              const selected = visibleResults[activeIndex]
              if (selected) {
                onSelect?.(selected)
                setQuery(selected.ticker)
                setOpen(false)
              }
            }
          }}
          placeholder={placeholder}
          className='border-border-subtle bg-bg-elevated pl-9 text-text-primary'
        />
        {loading ? <Loader2 className='absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-text-secondary' /> : null}
      </div>

      {open && visibleResults.length ? (
        <div className='absolute z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border border-accent-primary/30 bg-bg-surface/95 p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-md'>
          {visibleResults.map((result, index) => (
            <button
              key={`${result.ticker}-${index}`}
              type='button'
              onClick={() => {
                onSelect?.(result)
                setQuery(result.ticker)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                activeIndex === index ? 'bg-bg-elevated' : 'hover:bg-bg-elevated'
              )}
            >
              <img
                src={result.logoUrl || `https://financialmodelingprep.com/image-stock/${result.ticker}.png`}
                alt={result.ticker}
                className='h-8 w-8 rounded-full border border-border-subtle bg-bg-overlay object-cover'
                onError={(event) => {
                  ;(event.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                  <span className='font-mono text-sm font-semibold text-text-primary'>{result.ticker}</span>
                  {result.exchange ? <span className='rounded border border-border-subtle bg-bg-overlay px-1.5 py-0.5 font-ui text-[10px] uppercase tracking-[0.12em] text-text-secondary'>{result.exchange}</span> : null}
                </div>
                <p className='truncate font-ui text-xs text-text-secondary'>{result.companyName}</p>
              </div>
              <div className='text-right'>
                {result.marketCap ? <DataValue value={result.marketCap} type='currency' size='sm' precision={0} /> : <span className='font-ui text-xs text-text-muted'>-</span>}
              </div>
              {actionLabel && onAction ? (
                <span
                  onClick={(event) => {
                    event.stopPropagation()
                    onAction(result)
                    setOpen(false)
                  }}
                  className='inline-flex items-center gap-1 rounded-md border border-border-subtle bg-bg-overlay px-2 py-1 font-ui text-xs text-text-primary'
                >
                  <Plus className='h-3 w-3' />
                  {actionLabel}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default TickerSearch
