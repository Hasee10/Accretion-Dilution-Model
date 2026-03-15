import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { BrainCircuit, History, Send, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataValue } from '@/components/ui/data-value'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { apiUrl } from '@/lib/api'
import { fetchHeadlineSentiment, fetchTickerNews, type NewsArticle } from '@/lib/news/api'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { SentimentDot } from '@/components/news/sentiment-dot'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ContextType = 'merger' | 'dcf' | 'general'

type SummaryMetric = {
  label: string
  value: string | number
  type?: 'currency' | 'percentage' | 'number'
}

type AIContext = {
  type: ContextType
  data: Record<string, unknown>
  summary: SummaryMetric[]
}

type HistoryEntry = {
  id: string
  sessionId: string
  createdAt: string
  contextType: ContextType
  summary: SummaryMetric[]
  messages: Message[]
}

const HISTORY_KEY = 'qe-ai-chat-history'

const chipsByContext: Record<ContextType, string[]> = {
  merger: ['Explain the A/D result', 'What synergies justify this deal?', 'Key risks?', 'Compare to market multiples'],
  dcf: ['Is my WACC reasonable?', 'What drives intrinsic value here?', 'Sensitivity analysis explanation', 'Bull/bear case scenarios'],
  general: ['Summarize the current model', 'What risks should I focus on?', 'How should I pressure test this?'],
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]') as HistoryEntry[]
  } catch {
    return []
  }
}

function hydrateHistoryFromRows(rows: Array<Record<string, unknown>>): HistoryEntry[] {
  const grouped = rows.reduce<Record<string, HistoryEntry>>((accumulator, row) => {
    const sessionId = String(row.session_id)
    if (!accumulator[sessionId]) {
      accumulator[sessionId] = {
        id: sessionId,
        sessionId,
        createdAt: String(row.created_at),
        contextType: (row.context_type as ContextType) || 'general',
        summary: (((row.context_data as Record<string, unknown> | null)?.summary as SummaryMetric[]) || []),
        messages: [],
      }
    }
    accumulator[sessionId].messages.push({
      role: row.role as 'user' | 'assistant',
      content: String(row.content),
    })
    return accumulator
  }, {})

  return Object.values(grouped).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

function saveHistory(entry: HistoryEntry) {
  if (typeof window === 'undefined') return
  const existing = loadHistory()
  const next = [entry, ...existing].slice(0, 20)
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

function groupByDay(entries: HistoryEntry[]) {
  return entries.reduce<Record<string, HistoryEntry[]>>((groups, entry) => {
    const key = new Date(entry.createdAt).toLocaleDateString()
    groups[key] = groups[key] ? [...groups[key], entry] : [entry]
    return groups
  }, {})
}

function TypingDots() {
  return (
    <div className='flex items-center gap-1'>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className='h-2 w-2 animate-pulse rounded-full bg-text-secondary'
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </div>
  )
}

export function AIChatPanel({ context, relatedTicker }: { context: AIContext; relatedTicker?: string | null }) {
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [signature, setSignature] = useState('')
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID())
  const [relatedNews, setRelatedNews] = useState<NewsArticle[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function loadHistoryFromSupabase() {
      if (!userId) {
        setHistory(loadHistory())
        return
      }

      const { data } = await supabase
        .from('ai_chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200)

      setHistory(data ? hydrateHistoryFromRows(data as Array<Record<string, unknown>>) : [])
    }

    void loadHistoryFromSupabase()
  }, [userId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 112)}px`
  }, [input])

  const persistMessages = useCallback(
    async (userMessage: string | null, assistantMessage: string) => {
      const entry: HistoryEntry = {
        id: sessionId,
        sessionId,
        createdAt: new Date().toISOString(),
        contextType: context.type,
        summary: context.summary,
        messages: userMessage
          ? [
              { role: 'user', content: userMessage },
              { role: 'assistant', content: assistantMessage },
            ]
          : [{ role: 'assistant', content: assistantMessage }],
      }

      if (!userId) {
        saveHistory(entry)
        setHistory(loadHistory())
        return
      }

      const rows = [
        userMessage
          ? {
              user_id: userId,
              session_id: sessionId,
              role: 'user',
              content: userMessage,
              context_type: context.type,
              context_data: context.data,
            }
          : null,
        {
          user_id: userId,
          session_id: sessionId,
          role: 'assistant',
          content: assistantMessage,
          context_type: context.type,
          context_data: { ...context.data, summary: context.summary },
        },
      ].filter(Boolean)

      await supabase.from('ai_chat_history').insert(rows as never)
      const { data } = await supabase
        .from('ai_chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200)

      setHistory(data ? hydrateHistoryFromRows(data as Array<Record<string, unknown>>) : [])
    },
    [context.data, context.summary, context.type, sessionId, userId]
  )

  const sendMessage = useCallback(async (content: string, hidden = false) => {
    const trimmed = content.trim()
    if (!trimmed || streaming) return

    const nextMessages: Message[] = hidden ? [...messages] : [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    if (!hidden) setInput('')
    setStreaming(true)

    let assistantContent = ''
    setMessages((current) => [...current, { role: 'assistant', content: '' }])

    try {
      const requestMessages: Message[] = hidden ? [...messages, { role: 'user', content: trimmed }] : nextMessages
      const response = await fetch(apiUrl('/api/v1/ai/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: requestMessages,
          context: {
            type: context.type,
            data: context.data,
          },
          user_id: 'anonymous',
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error('AI Analyst is temporarily unavailable. Please try again.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const event of events) {
          const line = event.trim()
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') continue
          const parsed = JSON.parse(payload) as { content?: string; error?: string }
          if (parsed.error) throw new Error(parsed.error)
          if (parsed.content) {
            assistantContent += parsed.content
            setMessages((current) => {
              const copy = [...current]
              copy[copy.length - 1] = { role: 'assistant', content: assistantContent }
              return copy
            })
          }
        }
      }

      const finalMessages: Message[] = [...nextMessages, { role: 'assistant', content: assistantContent }]
      setMessages(finalMessages)
      await persistMessages(hidden ? null : trimmed, assistantContent)
    } catch {
      setMessages((current) => {
        const copy = [...current]
        copy[copy.length - 1] = {
          role: 'assistant',
          content: 'AI Analyst is temporarily unavailable. Please try again.',
        }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }, [context.data, context.summary, context.type, messages, persistMessages, sessionId, streaming, userId])

  useEffect(() => {
    if (!open) return
    const nextSignature = JSON.stringify(context.data)
    if (nextSignature === signature && messages.length) return
    setSignature(nextSignature)
    setSessionId(crypto.randomUUID())
    setMessages([])
    void sendMessage('Provide a one-sentence opening observation about the current model. Be direct and specific.', true)
  }, [open, context.data, messages.length, sendMessage, signature])

  useEffect(() => {
    if (!open || !relatedTicker) {
      setRelatedNews([])
      return
    }
    let active = true
    async function loadRelatedNews() {
      const payload = await fetchTickerNews(relatedTicker)
      const subset = payload.articles.slice(0, 3)
      if (!active) return
      setRelatedNews(subset)
      if (!subset.length) return
      const sentiments = await fetchHeadlineSentiment(subset.map((article) => article.title))
      if (!active) return
      setRelatedNews(subset.map((article, index) => ({ ...article, sentiment: sentiments.sentiments[index] ?? 'neutral' })))
    }
    void loadRelatedNews()
    return () => {
      active = false
    }
  }, [open, relatedTicker])

  const groupedHistory = useMemo(() => groupByDay(history), [history])
  const chips = chipsByContext[context.type]
  const contextLabel = context.type === 'merger' ? 'Merger Context' : context.type === 'dcf' ? 'DCF Context' : 'General Context'

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-accent-primary/30 bg-accent-primary px-4 py-3 text-sm font-medium text-black shadow-[0_0_0_1px_rgba(249,115,22,0.15)] transition hover:brightness-110'
      >
        <BrainCircuit className='h-4 w-4' />
        AI Analyst
      </button>

      <div className={cn('fixed inset-0 z-50 bg-black/30 transition-opacity', open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')} onClick={() => setOpen(false)} />
      <aside
        className={cn(
          'fixed right-0 top-0 z-[60] flex h-screen w-[380px] flex-col border-l border-border-default bg-bg-surface transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className='border-b border-border-subtle px-5 py-4'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <div className='flex items-center gap-2'>
                <BrainCircuit className='h-4 w-4 text-accent-primary' />
                <h2 className='font-display text-lg text-text-primary'>AI Analyst</h2>
              </div>
              <span className='mt-2 inline-flex rounded border border-border-subtle bg-bg-elevated px-2 py-1 font-ui text-[10px] uppercase tracking-[0.12em] text-text-secondary'>
                {contextLabel}
              </span>
            </div>
            <button type='button' onClick={() => setOpen(false)} className='rounded-md border border-border-subtle p-2 text-text-secondary hover:bg-bg-elevated hover:text-text-primary'>
              <X className='h-4 w-4' />
            </button>
          </div>

          <div className='mt-4 grid grid-cols-2 gap-2 rounded-lg border border-border-subtle bg-bg-elevated p-3'>
            {context.summary.slice(0, 4).map((metric) => (
              <div key={metric.label} className='space-y-1'>
                <p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>{metric.label}</p>
                {typeof metric.value === 'number' ? (
                  <DataValue value={metric.value} type={metric.type || 'number'} size='sm' colorMode={metric.type === 'percentage' ? 'auto' : 'default'} precision={metric.type === 'percentage' ? 1 : 2} />
                ) : (
                  <p className='font-mono text-[12px] text-text-secondary'>{metric.value}</p>
                )}
              </div>
            ))}
          </div>

          <div className='mt-4 flex gap-2'>
            <button
              type='button'
              onClick={() => setActiveTab('chat')}
              className={cn('flex-1 rounded-md px-3 py-2 font-ui text-xs uppercase tracking-[0.12em]', activeTab === 'chat' ? 'bg-bg-elevated text-text-primary' : 'text-text-secondary')}
            >
              <Sparkles className='mr-2 inline h-3.5 w-3.5' />Chat
            </button>
            <button
              type='button'
              onClick={() => setActiveTab('history')}
              className={cn('flex-1 rounded-md px-3 py-2 font-ui text-xs uppercase tracking-[0.12em]', activeTab === 'history' ? 'bg-bg-elevated text-text-primary' : 'text-text-secondary')}
            >
              <History className='mr-2 inline h-3.5 w-3.5' />History
            </button>
          </div>
        </div>

        {activeTab === 'chat' ? (
          <>
            <div ref={scrollRef} className='flex-1 space-y-4 overflow-y-auto px-5 py-4'>
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[88%] rounded-2xl px-4 py-3', message.role === 'user' ? 'bg-accent-primary text-white' : 'bg-bg-elevated text-text-primary')}>
                    {message.role === 'assistant' ? (
                      <div className='prose prose-invert prose-sm max-w-none text-sm'>
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className='mb-2 last:mb-0'>{children}</p>,
                            ul: ({ children }) => <ul className='ml-4 list-disc'>{children}</ul>,
                            ol: ({ children }) => <ol className='ml-4 list-decimal'>{children}</ol>,
                            li: ({ children }) => <li className='mb-1'>{children}</li>,
                            strong: ({ children }) => <strong className='font-semibold text-white'>{children}</strong>,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className='whitespace-pre-wrap font-ui text-sm'>{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {streaming ? (
                <div className='flex justify-start'>
                  <div className='rounded-2xl bg-bg-elevated px-4 py-3'>
                    <TypingDots />
                  </div>
                </div>
              ) : null}
            </div>

            <div className='border-t border-border-subtle px-5 py-4'>
              {relatedNews.length ? (
                <div className='mb-4 rounded-lg border border-border-subtle bg-bg-elevated p-3'>
                  <p className='mb-3 font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Related News</p>
                  <div className='space-y-2'>
                    {relatedNews.map((article) => (
                      <a key={article.id} href={article.url} target='_blank' rel='noreferrer' className='flex items-start gap-2 rounded-md px-1 py-1 text-left hover:bg-bg-overlay'>
                        <SentimentDot sentiment={article.sentiment} className='mt-1' />
                        <span className='line-clamp-1 font-ui text-xs text-text-secondary'>{article.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className='mb-3 flex flex-wrap gap-2'>
                {chips.map((chip) => (
                  <button
                    key={chip}
                    type='button'
                    onClick={() => setInput(chip)}
                    className='rounded-full border border-border-subtle bg-bg-elevated px-3 py-1.5 font-ui text-xs text-text-secondary hover:text-text-primary'
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <div className='flex items-end gap-2'>
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void sendMessage(input)
                    }
                  }}
                  placeholder='Ask QuantEdge AI about the current model...'
                  className='max-h-28 min-h-[44px] resize-none border-border-subtle bg-bg-elevated text-text-primary'
                />
                <Button onClick={() => void sendMessage(input)} disabled={streaming || !input.trim()} className='h-11 w-11 rounded-full bg-accent-primary text-black hover:bg-accent-primary/90'>
                  <Send className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className='flex-1 overflow-y-auto px-5 py-4'>
            {Object.entries(groupedHistory).length ? (
              Object.entries(groupedHistory).map(([day, entries]) => (
                <div key={day} className='mb-6'>
                  <p className='mb-3 font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>{day}</p>
                  <div className='space-y-2'>
                    {entries.map((entry) => (
                      <button
                        key={entry.id}
                        type='button'
                        onClick={() => {
                          setMessages(entry.messages)
                          setSessionId(entry.sessionId)
                          setActiveTab('chat')
                        }}
                        className='w-full rounded-lg border border-border-subtle bg-bg-elevated p-3 text-left hover:border-border-default'
                      >
                        <p className='font-ui text-xs uppercase tracking-[0.12em] text-text-muted'>{entry.contextType}</p>
                        <p className='mt-1 line-clamp-2 font-ui text-sm text-text-primary'>{entry.messages.find((message) => message.role === 'assistant')?.content || 'Saved conversation'}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className='flex h-full items-center justify-center text-center'>
                <p className='font-ui text-sm text-text-secondary'>No AI conversations saved yet.</p>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  )
}

export default AIChatPanel
