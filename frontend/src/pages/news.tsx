import { useEffect, useMemo, useState } from 'react'
import { Bookmark, Newspaper, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PremiumCard } from '@/components/ui/premium-card'
import { fetchHeadlineSentiment, fetchNewsFeed, fetchNewsPreferences, fetchNewsVideos, type NewsArticle, type NewsPreferences, type YouTubeVideo, updateNewsPreferences } from '@/lib/news/api'
import { NewsArticleCard } from '@/components/news/news-article-card'
import { NewsPreferencesSheet } from '@/components/news/news-preferences-sheet'
import { YouTubeVideoCard } from '@/components/news/youtube-video-card'
import { categoryAccent } from '@/components/news/news-utils'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'mergers', label: 'M&A Deals' },
  { id: 'markets', label: 'Markets' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'geopolitics', label: 'Geopolitics' },
  { id: 'macro', label: 'Macro' },
  { id: 'privateequity', label: 'PE & LBO' },
  { id: 'fintech', label: 'Fintech' },
  { id: 'ipo', label: 'IPO' },
] as const

type BookmarkRow = {
  article_url: string
}

export default function NewsPage() {
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const initialTicker = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ticker') : null
  const [preferences, setPreferences] = useState<NewsPreferences | null>(null)
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState(initialTicker ?? '')
  const [selectedCategory, setSelectedCategory] = useState<string>(initialTicker ? 'all' : 'all')
  const [staleBanner, setStaleBanner] = useState(false)

  const debouncedQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    if (!userId) return
    void loadPreferences()
    void loadBookmarks()
  }, [userId])

  useEffect(() => {
    if (!preferences) return
    void loadFeed(page === 1)
  }, [preferences, selectedCategory, page, debouncedQuery])

  useEffect(() => {
    const pending = articles.filter((article) => article.sentiment === null).slice(0, 20)
    if (!pending.length || !preferences?.show_sentiment) return

    let active = true
    void fetchHeadlineSentiment(pending.map((article) => article.title)).then((payload) => {
      if (!active) return
      setArticles((current) =>
        current.map((article) => {
          const index = pending.findIndex((entry) => entry.id === article.id)
          return index === -1 ? article : { ...article, sentiment: payload.sentiments[index] ?? 'neutral' }
        })
      )
    })

    return () => {
      active = false
    }
  }, [articles, preferences?.show_sentiment])

  async function loadPreferences() {
    if (!userId) return
    const prefs = await fetchNewsPreferences(userId)
    setPreferences(prefs)
  }

  async function loadBookmarks() {
    if (!userId) return
    const { data } = await supabase.from('news_bookmarks').select('article_url').eq('user_id', userId)
    setBookmarks(new Set(((data || []) as BookmarkRow[]).map((item) => item.article_url)))
  }

  async function loadFeed(reset: boolean) {
    if (!preferences) return
    setLoading(true)
    try {
      const categoryList =
        selectedCategory === 'all'
          ? preferences.categories
          : [selectedCategory]
      const tickers = initialTicker ? [initialTicker] : preferences.followed_tickers
      const [feed, videoPayload] = await Promise.all([
        fetchNewsFeed({
          categories: categoryList,
          tickers,
          search: debouncedQuery,
          page,
          pageSize: 12,
        }),
        fetchNewsVideos({
          query: debouncedQuery || categoryList.join(' '),
          channelIds: preferences.followed_channels,
          maxResults: 9,
        }),
      ])

      const nextArticles = feed.articles.map((article) => ({ ...article, sentiment: preferences.show_sentiment ? article.sentiment : null }))
      setArticles((current) => {
        if (reset) return nextArticles
        const merged = [...current, ...nextArticles]
        const seen = new Set<string>()
        return merged.filter((article) => {
          if (seen.has(article.id)) return false
          seen.add(article.id)
          return true
        })
      })
      setVideos(videoPayload.hidden_due_to_quota ? [] : videoPayload.videos)
      setStaleBanner(!!feed.is_stale)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load market news')
    } finally {
      setLoading(false)
    }
  }

  async function toggleBookmark(article: NewsArticle) {
    if (!userId) {
      toast.error('Sign in to save bookmarks')
      return
    }

    if (bookmarks.has(article.url)) {
      await supabase.from('news_bookmarks').delete().eq('user_id', userId).eq('article_url', article.url)
      setBookmarks((current) => {
        const next = new Set(current)
        next.delete(article.url)
        return next
      })
      return
    }

    await supabase.from('news_bookmarks').insert({
      user_id: userId,
      article_url: article.url,
      title: article.title,
      source: article.source,
      published_at: article.published_at,
      sentiment: article.sentiment,
      category: article.category,
      thumbnail_url: article.thumbnail_url,
    } as never)
    setBookmarks((current) => new Set(current).add(article.url))
  }

  const visibleArticles = useMemo(() => {
    if (!preferences) return articles
    return articles.filter((article) => !preferences.excluded_sources.includes(article.source))
  }, [articles, preferences])

  const heroArticle = visibleArticles.find((article) => article.thumbnail_url) ?? visibleArticles[0]
  const magazineRest = visibleArticles.filter((article) => article.id !== heroArticle?.id)

  return (
    <div className='min-h-screen bg-bg-base'>
      <div className='space-y-8 p-6 md:p-8'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2'>
              <Newspaper className='h-5 w-5 text-accent-primary' />
              <h1 className='font-display text-4xl font-semibold tracking-[-0.03em] text-text-primary'>Market Intelligence</h1>
            </div>
            <p className='mt-2 font-ui text-sm text-text-secondary'>Stay ahead of the market with live finance news, deals, and video analysis.</p>
          </div>
          {preferences ? (
            <NewsPreferencesSheet
              preferences={preferences}
              onSave={async (next) => {
                await updateNewsPreferences(next)
                setPreferences(next)
                setPage(1)
              }}
            />
          ) : null}
        </div>

        <div className='flex flex-wrap items-center gap-3'>
          <div className='relative min-w-[280px] flex-1'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted' />
            <Input
              value={query}
              onChange={(event) => {
                setPage(1)
                setQuery(event.target.value)
              }}
              placeholder='Search markets, companies, deals...'
              className='border-border-subtle bg-bg-surface pl-9 pr-10 text-text-primary'
            />
            {query ? (
              <button type='button' onClick={() => { setQuery(''); setPage(1) }} className='absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary'>
                <X className='h-4 w-4' />
              </button>
            ) : null}
          </div>
          <Button variant='outline' asChild className='border-border-subtle bg-bg-surface hover:bg-bg-elevated'>
            <a href='/bookmarks'>
              <Bookmark className='mr-2 h-4 w-4' />
              Bookmarks
            </a>
          </Button>
        </div>

        {staleBanner ? (
          <div className='rounded-xl border border-accent-amber/20 bg-accent-amber/10 px-4 py-3 font-ui text-sm text-accent-amber'>
            Showing cached articles · Live data temporarily unavailable.
          </div>
        ) : null}

        <div className='grid gap-8 xl:grid-cols-[260px_1fr]'>
          <aside className='space-y-6'>
            <PremiumCard accentColor='primary'>
              <div className='space-y-4'>
                <h3 className='font-display text-lg text-text-primary'>Filters</h3>
                <div className='space-y-3'>
                  <p className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Tickers</p>
                  <div className='flex flex-wrap gap-2'>
                    {(preferences?.followed_tickers.length ? preferences.followed_tickers : (initialTicker ? [initialTicker] : [])).map((ticker) => (
                      <span key={ticker} className='rounded-full border border-accent-primary/30 bg-accent-primary/10 px-2.5 py-1 font-ui text-xs text-accent-primary'>
                        {ticker}
                      </span>
                    ))}
                  </div>
                </div>
                <div className='space-y-3'>
                  <p className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Sources</p>
                  <div className='space-y-2'>
                    {['Reuters', 'Bloomberg', 'CNBC', 'Financial Times', 'MarketWatch'].map((source) => (
                      <label key={source} className='flex items-center justify-between rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2'>
                        <span className='font-ui text-sm text-text-primary'>{source}</span>
                        <span className='font-ui text-xs text-text-muted'>
                          {preferences?.excluded_sources.includes(source) ? 'Hidden' : 'Shown'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className='space-y-3'>
                  <p className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>Layout</p>
                  <div className='grid grid-cols-3 gap-2'>
                    {(['grid', 'list', 'magazine'] as const).map((layout) => (
                      <button
                        key={layout}
                        type='button'
                        onClick={() => preferences && setPreferences({ ...preferences, feed_layout: layout })}
                        className={`rounded-lg border px-3 py-2 font-ui text-xs ${
                          preferences?.feed_layout === layout
                            ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                            : 'border-border-subtle bg-bg-elevated text-text-secondary'
                        }`}
                      >
                        {layout}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PremiumCard>
          </aside>

          <main className='space-y-6'>
            <div className='flex gap-2 overflow-x-auto pb-2'>
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type='button'
                  onClick={() => {
                    setSelectedCategory(category.id)
                    setPage(1)
                  }}
                  className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 font-ui text-sm ${
                    selectedCategory === category.id
                      ? 'border-current bg-bg-elevated text-text-primary'
                      : 'border-transparent text-text-muted hover:text-text-primary'
                  }`}
                  style={selectedCategory === category.id ? { borderColor: category.id === 'all' ? 'var(--text-primary)' : categoryAccent(category.id) } : undefined}
                >
                  <span className='h-2 w-2 rounded-full' style={{ backgroundColor: category.id === 'all' ? 'var(--text-primary)' : categoryAccent(category.id) }} />
                  {category.label}
                </button>
              ))}
            </div>

            {loading && page === 1 ? (
              <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className='aspect-[4/5] animate-pulse rounded-2xl bg-bg-elevated' />
                ))}
              </div>
            ) : preferences?.feed_layout === 'list' ? (
              <div className='space-y-4'>
                {visibleArticles.map((article) => (
                  <NewsArticleCard key={article.id} article={article} layout='list' bookmarked={bookmarks.has(article.url)} onToggleBookmark={toggleBookmark} />
                ))}
              </div>
            ) : preferences?.feed_layout === 'magazine' && heroArticle ? (
              <div className='space-y-6'>
                <NewsArticleCard article={heroArticle} layout='magazine' bookmarked={bookmarks.has(heroArticle.url)} onToggleBookmark={toggleBookmark} />
                <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                  {magazineRest.map((article) => (
                    <NewsArticleCard key={article.id} article={article} bookmarked={bookmarks.has(article.url)} onToggleBookmark={toggleBookmark} />
                  ))}
                </div>
              </div>
            ) : (
              <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                {visibleArticles.map((article) => (
                  <NewsArticleCard key={article.id} article={article} bookmarked={bookmarks.has(article.url)} onToggleBookmark={toggleBookmark} />
                ))}
              </div>
            )}

            {videos.length ? (
              <section className='space-y-4'>
                <div>
                  <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>YouTube Finance</p>
                </div>
                <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                  {videos.map((video) => (
                    <YouTubeVideoCard key={video.id} video={video} />
                  ))}
                </div>
              </section>
            ) : null}

            <div className='flex justify-center'>
              <Button variant='outline' onClick={() => setPage((current) => current + 1)} disabled={loading}>
                Load more articles
              </Button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
