import { useEffect, useMemo, useState } from 'react'
import { Bookmark, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FinanceTable, type FinanceColumn } from '@/components/ui/finance-table'
import { SentimentDot } from '@/components/news/sentiment-dot'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

type BookmarkRow = {
  id: string
  article_url: string
  title: string
  source: string | null
  category: string | null
  sentiment: 'bullish' | 'bearish' | 'neutral' | null
  published_at: string | null
  bookmarked_at: string
}

export default function BookmarksPage() {
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const [rows, setRows] = useState<BookmarkRow[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    void loadBookmarks()
  }, [userId])

  async function loadBookmarks() {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase.from('news_bookmarks').select('*').eq('user_id', userId).order('bookmarked_at', { ascending: false })
    setRows((data || []) as BookmarkRow[])
    setLoading(false)
  }

  async function removeBookmark(row: BookmarkRow) {
    await supabase.from('news_bookmarks').delete().eq('id', row.id)
    setSelected((current) => current.filter((id) => id !== row.id))
    await loadBookmarks()
  }

  async function removeSelected() {
    if (!selected.length) return
    await supabase.from('news_bookmarks').delete().in('id', selected)
    setSelected([])
    await loadBookmarks()
  }

  const allSelected = rows.length > 0 && selected.length === rows.length

  const columns: FinanceColumn<BookmarkRow>[] = useMemo(() => [
    {
      key: 'id',
      title: '',
      render: (_value, row) => (
        <Checkbox
          checked={selected.includes(row.id)}
          onCheckedChange={(checked) => {
            setSelected((current) => checked ? [...current, row.id] : current.filter((id) => id !== row.id))
          }}
          onClick={(event) => event.stopPropagation()}
        />
      ),
    },
    { key: 'title', title: 'Title', sortable: true },
    { key: 'source', title: 'Source', sortable: true },
    { key: 'category', title: 'Category', sortable: true },
    {
      key: 'sentiment',
      title: 'Sentiment',
      render: (value) => (
        <div className='flex justify-center'>
          <SentimentDot sentiment={(value as BookmarkRow['sentiment']) ?? null} />
        </div>
      ),
    },
    { key: 'bookmarked_at', title: 'Saved', type: 'date', sortable: true },
    {
      key: 'article_url',
      title: 'Open',
      render: (value) => (
        <a href={String(value)} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1 font-ui text-xs text-accent-primary hover:text-text-primary' onClick={(event) => event.stopPropagation()}>
          Open
          <ExternalLink className='h-3.5 w-3.5' />
        </a>
      ),
    },
    {
      key: 'id',
      title: 'Remove',
      render: (_value, row) => (
        <button type='button' className='inline-flex items-center gap-1 font-ui text-xs text-negative' onClick={(event) => { event.stopPropagation(); void removeBookmark(row) }}>
          <Trash2 className='h-3.5 w-3.5' />
          Remove
        </button>
      ),
    },
  ], [selected])

  return (
    <div className='min-h-screen bg-bg-base'>
      <div className='space-y-8 p-6 md:p-8'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <div className='flex items-center gap-2'>
              <Bookmark className='h-5 w-5 text-accent-primary' />
              <h1 className='font-display text-4xl font-semibold tracking-[-0.03em] text-text-primary'>Bookmarks</h1>
            </div>
            <p className='mt-2 font-ui text-sm text-text-secondary'>Saved market articles and research links for your workspace.</p>
          </div>
          <div className='flex items-center gap-3'>
            <label className='inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 font-ui text-sm text-text-primary'>
              <Checkbox checked={allSelected} onCheckedChange={(checked) => setSelected(checked ? rows.map((row) => row.id) : [])} />
              Select all
            </label>
            <Button variant='outline' onClick={() => void removeSelected()} disabled={!selected.length}>
              Delete selected
            </Button>
          </div>
        </div>

        {rows.length === 0 && !loading ? (
          <div className='flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-border-subtle bg-bg-surface text-center'>
            <div className='rounded-full border border-border-subtle bg-bg-elevated p-4'>
              <Bookmark className='h-6 w-6 text-text-muted' />
            </div>
            <div className='space-y-2'>
              <h2 className='font-display text-xl text-text-primary'>No saved articles yet</h2>
              <p className='font-ui text-sm text-text-secondary'>Head to Market Intelligence to start bookmarking articles.</p>
            </div>
            <Button asChild>
              <a href='/news'>Go to News</a>
            </Button>
          </div>
        ) : (
          <FinanceTable data={rows} columns={columns} loading={loading} emptyMessage='No saved articles yet.' />
        )}
      </div>
    </div>
  )
}
