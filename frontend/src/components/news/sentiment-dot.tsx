import { cn } from '@/lib/utils'
import type { NewsSentiment } from '@/lib/news/api'

export function sentimentLabel(sentiment: NewsSentiment) {
  if (sentiment === 'bullish') return 'Bullish'
  if (sentiment === 'bearish') return 'Bearish'
  if (sentiment === 'neutral') return 'Neutral'
  return 'Loading sentiment'
}

export function SentimentDot({ sentiment, className }: { sentiment: NewsSentiment; className?: string }) {
  return (
    <span
      title={sentimentLabel(sentiment)}
      className={cn(
        'inline-flex h-2.5 w-2.5 rounded-full',
        sentiment === 'bullish' && 'bg-positive',
        sentiment === 'bearish' && 'bg-negative',
        sentiment === 'neutral' && 'bg-text-muted',
        sentiment === null && 'animate-pulse bg-text-muted/40',
        className
      )}
    />
  )
}
