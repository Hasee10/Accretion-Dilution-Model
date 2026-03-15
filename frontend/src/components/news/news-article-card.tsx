import { Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { NewsArticle } from '@/lib/news/api'
import { cn } from '@/lib/utils'
import { categoryAccent, categoryLabel, relativeTime } from './news-utils'
import { SentimentDot } from './sentiment-dot'

export function NewsArticleCard({
  article,
  layout = 'grid',
  bookmarked = false,
  onToggleBookmark,
}: {
  article: NewsArticle
  layout?: 'grid' | 'list' | 'magazine'
  bookmarked?: boolean
  onToggleBookmark?: (article: NewsArticle) => void
}) {
  const accent = categoryAccent(article.category)
  const image = article.thumbnail_url || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=80'

  return (
    <a
      href={article.url}
      target='_blank'
      rel='noreferrer'
      className={cn(
        'group overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-border-default',
        layout === 'list' && 'grid grid-cols-[120px_1fr] gap-0',
        layout === 'magazine' && 'lg:grid lg:grid-cols-[1.2fr_1fr]'
      )}
    >
      <div className={cn('relative overflow-hidden', layout === 'list' ? 'h-full min-h-[120px]' : 'aspect-[16/9]')}>
        <img
          src={image}
          alt={article.title}
          className='h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]'
        />
        <span
          className='absolute left-3 top-3 inline-flex rounded-full px-2.5 py-1 font-ui text-[10px] uppercase tracking-[0.12em] text-white'
          style={{ backgroundColor: accent }}
        >
          {categoryLabel(article.category)}
        </span>
      </div>

      <div className='flex flex-1 flex-col p-4'>
        <div className='flex items-start justify-between gap-3'>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <SentimentDot sentiment={article.sentiment} />
              <span className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>{article.source}</span>
            </div>
            <h3
              className={cn(
                'font-display text-[15px] leading-tight text-text-primary',
                layout === 'magazine' ? 'line-clamp-3 text-2xl' : 'line-clamp-2'
              )}
            >
              {article.title}
            </h3>
          </div>

          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='h-8 w-8 shrink-0 rounded-full border border-border-subtle bg-bg-elevated'
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onToggleBookmark?.(article)
            }}
          >
            {bookmarked ? <BookmarkCheck className='h-4 w-4 text-accent-primary' /> : <Bookmark className='h-4 w-4 text-text-secondary' />}
          </Button>
        </div>

        <p className={cn('mt-3 line-clamp-3 font-ui text-[13px] text-text-secondary', layout === 'magazine' && 'text-sm')}>
          {article.summary || 'Open the article for the full story.'}
        </p>

        <div className='mt-auto flex items-center justify-between pt-4'>
          <div className='flex items-center gap-3 font-mono text-[11px] text-text-secondary'>
            <span className='text-accent-primary'>{article.source}</span>
            <span>{relativeTime(article.published_at)}</span>
          </div>
          <span className='inline-flex items-center gap-1 font-ui text-xs text-text-muted group-hover:text-text-primary'>
            Open
            <ExternalLink className='h-3.5 w-3.5' />
          </span>
        </div>
      </div>
    </a>
  )
}
