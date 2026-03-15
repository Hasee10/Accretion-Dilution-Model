import { useEffect, useMemo, useState } from 'react'
import { Settings2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import type { NewsPreferences } from '@/lib/news/api'

const CATEGORY_OPTIONS = ['markets', 'mergers', 'earnings', 'geopolitics', 'macro', 'privateequity', 'fintech', 'ipo']
const CHANNEL_OPTIONS = [
  { id: 'UCrM7B7SL_g1edFOnmj-SDKg', label: 'Bloomberg' },
  { id: 'UCvJJ_dzjViJCoLf5uKUTwoA', label: 'CNBC' },
  { id: 'UCddiUEpeqJcYeBxX1IVBKvQ', label: 'Patrick Boyle' },
  { id: 'UCWX3yGbODI3HLCnBxQBHoHg', label: 'Goldman Sachs' },
  { id: 'UCEAZeUIeJs0IjQiqTCdVSIg', label: 'Acquired Podcast' },
]

export function NewsPreferencesSheet({
  preferences,
  onSave,
}: {
  preferences: NewsPreferences | null
  onSave: (preferences: NewsPreferences) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NewsPreferences | null>(preferences)
  const [tickerInput, setTickerInput] = useState('')
  const [channelInput, setChannelInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft(preferences)
  }, [preferences])

  const followedTickers = useMemo(() => draft?.followed_tickers ?? [], [draft])
  const followedChannels = useMemo(() => draft?.followed_channels ?? [], [draft])

  if (!draft) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant='outline' className='border-border-subtle bg-bg-surface hover:bg-bg-elevated'>
          <Settings2 className='mr-2 h-4 w-4' />
          Prefs
        </Button>
      </SheetTrigger>
      <SheetContent className='overflow-y-auto border-border-default bg-bg-surface text-text-primary sm:max-w-lg'>
        <SheetHeader className='border-b border-border-subtle'>
          <SheetTitle className='font-display text-2xl text-text-primary'>News Preferences</SheetTitle>
          <SheetDescription className='font-ui text-sm text-text-secondary'>
            Personalize categories, tickers, channels, layout, and sentiment display.
          </SheetDescription>
        </SheetHeader>

        <div className='space-y-8 p-5'>
          <section className='space-y-4'>
            <h3 className='font-display text-lg text-text-primary'>Default Categories</h3>
            <div className='grid grid-cols-2 gap-3'>
              {CATEGORY_OPTIONS.map((category) => (
                <label key={category} className='flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-elevated px-3 py-3 font-ui text-sm text-text-primary'>
                  <Checkbox
                    checked={draft.categories.includes(category)}
                    onCheckedChange={(checked) => {
                      setDraft((current) => {
                        if (!current) return current
                        return {
                          ...current,
                          categories: checked
                            ? [...current.categories, category]
                            : current.categories.filter((value) => value !== category),
                        }
                      })
                    }}
                  />
                  {category}
                </label>
              ))}
            </div>
          </section>

          <section className='space-y-4'>
            <h3 className='font-display text-lg text-text-primary'>Followed Tickers</h3>
            <Input
              value={tickerInput}
              placeholder='Type ticker and press Enter'
              onChange={(event) => setTickerInput(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  const value = tickerInput.trim().toUpperCase()
                  if (!value) return
                  setDraft((current) => current ? {
                    ...current,
                    followed_tickers: current.followed_tickers.includes(value)
                      ? current.followed_tickers
                      : [...current.followed_tickers, value],
                  } : current)
                  setTickerInput('')
                }
              }}
            />
            <div className='flex flex-wrap gap-2'>
              {followedTickers.map((ticker) => (
                <Badge key={ticker} variant='outline' className='gap-2 border-border-subtle bg-bg-elevated px-3 py-1 text-text-primary'>
                  {ticker}
                  <button
                    type='button'
                    onClick={() => setDraft((current) => current ? { ...current, followed_tickers: current.followed_tickers.filter((value) => value !== ticker) } : current)}
                  >
                    <X className='h-3 w-3' />
                  </button>
                </Badge>
              ))}
            </div>
          </section>

          <section className='space-y-4'>
            <h3 className='font-display text-lg text-text-primary'>YouTube Channels</h3>
            <div className='space-y-3'>
              {CHANNEL_OPTIONS.map((channel) => (
                <label key={channel.id} className='flex items-center justify-between rounded-xl border border-border-subtle bg-bg-elevated px-4 py-3'>
                  <span className='font-ui text-sm text-text-primary'>{channel.label}</span>
                  <Switch
                    checked={followedChannels.includes(channel.id)}
                    onCheckedChange={(checked) => {
                      setDraft((current) => {
                        if (!current) return current
                        return {
                          ...current,
                          followed_channels: checked
                            ? [...current.followed_channels, channel.id]
                            : current.followed_channels.filter((value) => value !== channel.id),
                        }
                      })
                    }}
                  />
                </label>
              ))}
            </div>
            <div className='space-y-2'>
              <Label>Custom Channel ID</Label>
              <Input
                value={channelInput}
                placeholder='Paste channel ID and press Enter'
                onChange={(event) => setChannelInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    const value = channelInput.trim()
                    if (!value) return
                    setDraft((current) => current ? {
                      ...current,
                      followed_channels: current.followed_channels.includes(value)
                        ? current.followed_channels
                        : [...current.followed_channels, value],
                    } : current)
                    setChannelInput('')
                  }
                }}
              />
            </div>
          </section>

          <section className='space-y-4'>
            <h3 className='font-display text-lg text-text-primary'>Feed Layout</h3>
            <div className='grid grid-cols-3 gap-3'>
              {(['grid', 'list', 'magazine'] as const).map((layout) => (
                <button
                  key={layout}
                  type='button'
                  onClick={() => setDraft((current) => current ? { ...current, feed_layout: layout } : current)}
                  className={`rounded-xl border px-4 py-4 font-ui text-sm transition ${
                    draft.feed_layout === layout
                      ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                      : 'border-border-subtle bg-bg-elevated text-text-secondary'
                  }`}
                >
                  {layout}
                </button>
              ))}
            </div>
          </section>

          <section className='space-y-4'>
            <h3 className='font-display text-lg text-text-primary'>Sentiment Dots</h3>
            <label className='flex items-center justify-between rounded-xl border border-border-subtle bg-bg-elevated px-4 py-3'>
              <span className='font-ui text-sm text-text-primary'>Show bullish / bearish / neutral tags</span>
              <Switch
                checked={draft.show_sentiment}
                onCheckedChange={(checked) => setDraft((current) => current ? { ...current, show_sentiment: checked } : current)}
              />
            </label>
          </section>
        </div>

        <div className='flex justify-end gap-3 border-t border-border-subtle p-5'>
          <Button variant='outline' onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              try {
                await onSave(draft)
                toast.success('News preferences updated')
                setOpen(false)
              } catch {
                toast.error('Failed to save preferences')
              } finally {
                setSaving(false)
              }
            }}
          >
            Save Preferences
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
