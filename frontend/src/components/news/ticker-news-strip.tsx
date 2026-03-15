import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Newspaper } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { fetchHeadlineSentiment, fetchTickerNews, type NewsArticle } from '@/lib/news/api'
import { SentimentDot } from './sentiment-dot'
import { relativeTime } from './news-utils'

export function TickerNewsStrip({ ticker }: { ticker: string | null | undefined }) {
  const [expanded, setExpanded] = useState(true)
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ticker) return
    let active = true
    async function load() {
      setLoading(true)
      try {
        const payload = await fetchTickerNews(ticker)
        const subset = payload.articles.slice(0, 3)
        setArticles(subset)
        if (subset.length) {
          const sentiments = await fetchHeadlineSentiment(subset.map((article) => article.title))
          if (!active) return
          setArticles(subset.map((article, index) => ({ ...article, sentiment: sentiments.sentiments[index] ?? 'neutral' })))
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [ticker])

  if (!ticker || (!loading && !articles.length)) return null

  return (
    <div className='rounded-2xl border border-border-subtle bg-bg-surface p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <Newspaper className='h-4 w-4 text-accent-primary' />
          <h3 className='font-display text-base text-text-primary'>Latest on {ticker}</h3>
        </div>
        <div className='flex items-center gap-3'>
          <Link
            to='/news'
            search={{ ticker } as never}
            className='font-ui text-xs text-accent-primary hover:text-text-primary'
          >
            See more
          </Link>
          <button type='button' onClick={() => setExpanded((current) => !current)} className='font-ui text-xs text-text-secondary hover:text-text-primary'>
            {expanded ? 'Hide news' : 'Show news'} {expanded ? <ChevronUp className='inline h-3.5 w-3.5' /> : <ChevronDown className='inline h-3.5 w-3.5' />}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className='mt-4 space-y-3'>
          {loading && !articles.length ? (
            <p className='font-ui text-sm text-text-secondary'>Loading related coverage...</p>
          ) : (
            articles.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target='_blank'
                rel='noreferrer'
                className='block rounded-xl border border-border-subtle bg-bg-elevated px-4 py-3 transition hover:border-border-default'
              >
                <div className='flex items-start gap-3'>
                  <SentimentDot sentiment={article.sentiment} className='mt-1' />
                  <div className='min-w-0 flex-1'>
                    <p className='line-clamp-2 font-ui text-sm text-text-primary'>{article.title}</p>
                    <p className='mt-1 font-ui text-xs text-text-secondary'>
                      {article.source} · {relativeTime(article.published_at)}
                    </p>
                  </div>
                </div>
              </a>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
