import { AlertTriangle, ExternalLink, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataValue } from '@/components/ui/data-value'
import { PremiumCard } from '@/components/ui/premium-card'
import { CompanySnapshot } from '@/lib/market/market-api'

function RangeBar({ low, high, current }: { low?: number | null; high?: number | null; current?: number | null }) {
  if (!low || !high || !current || high <= low) return null
  const ratio = ((current - low) / (high - low)) * 100
  return (
    <div className='space-y-2'>
      <div className='relative h-2 rounded-full bg-bg-overlay'>
        <div className='absolute left-0 top-0 h-2 rounded-full bg-[linear-gradient(90deg,var(--accent-cyan),var(--accent-primary))]' style={{ width: `${Math.max(0, Math.min(100, ratio))}%` }} />
        <span className='absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-accent-primary' style={{ left: `calc(${Math.max(0, Math.min(100, ratio))}% - 6px)` }} />
      </div>
      <div className='flex justify-between font-mono text-[11px] text-text-secondary'>
        <span>{low.toFixed(2)}</span>
        <span>{high.toFixed(2)}</span>
      </div>
    </div>
  )
}

export function CompanyCard({
  company,
  onAddToWatchlist,
}: {
  company: CompanySnapshot
  onAddToWatchlist?: () => void
}) {
  return (
    <PremiumCard accentColor='primary'>
      <div className='space-y-4'>
        {company.stale ? (
          <div className='flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2'>
            <AlertTriangle className='h-4 w-4 text-accent-amber' />
            <p className='font-ui text-xs text-accent-amber'>Data may be stale or older than 24 hours.</p>
          </div>
        ) : null}

        <div className='flex items-start justify-between gap-3'>
          <div className='flex items-start gap-3'>
            <img src={company.logoUrl} alt={company.ticker} className='h-11 w-11 rounded-full border border-border-subtle bg-bg-overlay object-cover' />
            <div>
              <div className='flex items-center gap-2'>
                <h3 className='font-display text-lg text-text-primary'>{company.companyName}</h3>
                <span className='font-mono text-sm text-accent-primary'>{company.ticker}</span>
                <span className='rounded border border-border-subtle bg-bg-overlay px-1.5 py-0.5 font-ui text-[10px] uppercase tracking-[0.12em] text-text-secondary'>{company.exchange}</span>
              </div>
              <p className='font-ui text-sm text-text-secondary'>{company.sector || 'N/A'} | {company.industry || 'N/A'}</p>
            </div>
          </div>
          {onAddToWatchlist ? (
            <Button variant='outline' size='sm' onClick={onAddToWatchlist} className='border-border-subtle bg-bg-elevated hover:bg-bg-overlay'>
              <Plus className='mr-2 h-4 w-4' />
              Add to Watchlist
            </Button>
          ) : null}
        </div>

        <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
          <div>
            <p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>P/E</p>
            <p className='font-mono text-sm text-text-primary'>{company.peRatio ? `${company.peRatio.toFixed(1)}x` : 'N/A'}</p>
          </div>
          <div>
            <p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>EV</p>
            <DataValue value={company.enterpriseValue || 0} type='currency' size='sm' precision={0} />
          </div>
          <div>
            <p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Beta</p>
            <p className='font-mono text-sm text-text-primary'>{company.beta?.toFixed(2) || 'N/A'}</p>
          </div>
          <div>
            <p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Source</p>
            <p className='font-ui text-xs text-text-secondary'>{company.source === 'live' ? 'Live data' : `Cached data (${company.cacheAgeHours}h ago)`}</p>
          </div>
        </div>

        <RangeBar low={company.yearLow} high={company.yearHigh} current={company.price} />

        <div className='flex items-center justify-between border-t border-border-subtle pt-3'>
          <div className='space-y-1'>
            <p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Reference EPS</p>
            <p className='font-mono text-sm text-text-primary'>{company.eps?.toFixed(2) || 'N/A'}</p>
          </div>
          <a href={company.attributionUrl} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1 font-ui text-xs text-text-secondary hover:text-text-primary'>
            Market data source
            <ExternalLink className='h-3 w-3' />
          </a>
        </div>
      </div>
    </PremiumCard>
  )
}

export default CompanyCard
