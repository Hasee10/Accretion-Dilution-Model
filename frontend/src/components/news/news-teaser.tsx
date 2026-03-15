import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Newspaper } from 'lucide-react'
import { fetchHeadlineSentiment, fetchNewsFeed, fetchNewsVideos, type NewsArticle, type YouTubeVideo } from '@/lib/news/api'
import { PremiumCard } from '@/components/ui/premium-card'
import { SentimentDot } from './sentiment-dot'
import { relativeTime } from './news-utils'

export function NewsTeaser() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      try {
        const [feed, videoPayload] = await Promise.all([
          fetchNewsFeed({ categories: ['markets', 'mergers'], pageSize: 4 }),
          fetchNewsVideos({ maxResults: 3 }),
        ])
        if (!active) return
        setArticles(feed.articles)
        setVideos(videoPayload.videos.slice(0, 3))
        if (feed.articles.length) {
          const sentiment = await fetchHeadlineSentiment(feed.articles.map((article) => article.title))
          if (!active) return
          setArticles(feed.articles.map((article, index) => ({ ...article, sentiment: sentiment.sentiments[index] ?? 'neutral' })))
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 10 * 60 * 1000)

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', visibilityHandler)

    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', visibilityHandler)
    }
  }, [])

  const featured = articles[0]
  const compact = useMemo(() => articles.slice(1, 4), [articles])

  return (
    <PremiumCard accentColor='emerald'>
      <div className='space-y-6'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2'>
              <Newspaper className='h-4 w-4 text-accent-emerald' />
              <h2 className='font-display text-2xl text-text-primary'>Market Intelligence</h2>
              <span className='inline-flex items-center gap-1 rounded-full border border-positive/20 bg-positive/10 px-2 py-0.5 font-ui text-[10px] uppercase tracking-[0.12em] text-positive'>
                <span className='h-2 w-2 animate-pulse rounded-full bg-positive' />
                Live
              </span>
            </div>
            <p className='mt-2 font-ui text-sm text-text-secondary'>Live finance news, deals, and market-moving stories.</p>
          </div>
          <Link to='/news' className='inline-flex items-center gap-1 font-ui text-sm text-accent-primary hover:text-text-primary'>
            View all news
            <ArrowRight className='h-4 w-4' />
          </Link>
        </div>

        {loading ? (
          <div className='grid gap-4 lg:grid-cols-[1.1fr_0.9fr]'>
            <div className='aspect-[16/10] animate-pulse rounded-2xl bg-bg-elevated' />
            <div className='space-y-3'>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className='h-24 animate-pulse rounded-2xl bg-bg-elevated' />
              ))}
            </div>
          </div>
        ) : featured ? (
          <div className='grid gap-4 lg:grid-cols-[1.1fr_0.9fr]'>
            <a href={featured.url} target='_blank' rel='noreferrer' className='overflow-hidden rounded-2xl border border-border-subtle bg-bg-elevated'>
              <img src={featured.thumbnail_url || ''} alt={featured.title} className='aspect-[16/10] w-full object-cover' />
              <div className='space-y-3 p-4'>
                <div className='flex items-center gap-2'>
                  <SentimentDot sentiment={featured.sentiment} />
                  <span className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>{featured.source}</span>
                </div>
                <h3 className='line-clamp-3 font-display text-xl text-text-primary'>{featured.title}</h3>
                <p className='font-ui text-sm text-text-secondary'>{relativeTime(featured.published_at)}</p>
              </div>
            </a>
            <div className='space-y-3'>
              {compact.map((article) => (
                <a key={article.id} href={article.url} target='_blank' rel='noreferrer' className='block rounded-2xl border border-border-subtle bg-bg-elevated p-4 transition hover:border-border-default'>
                  <div className='flex items-start gap-3'>
                    <SentimentDot sentiment={article.sentiment} className='mt-1' />
                    <div>
                      <p className='line-clamp-2 font-display text-[15px] text-text-primary'>{article.title}</p>
                      <p className='mt-2 font-ui text-xs text-text-secondary'>{article.source} · {relativeTime(article.published_at)}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {videos.length ? (
          <div className='space-y-3'>
            <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Latest from YouTube</p>
            <div className='grid gap-3 md:grid-cols-3'>
              {videos.map((video) => (
                <a key={video.id} href={video.youtube_url} target='_blank' rel='noreferrer' className='overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated'>
                  <img src={video.thumbnail_url} alt={video.title} className='aspect-video w-full object-cover' />
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </PremiumCard>
  )
}
