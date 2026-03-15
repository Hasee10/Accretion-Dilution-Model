import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { BrainCircuit, ExternalLink, MessageSquareText, Sparkles } from 'lucide-react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PremiumCard } from '@/components/ui/premium-card'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

type MessageRow = {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  context_type: 'merger' | 'dcf' | 'general' | null
  context_data: Record<string, unknown> | null
  created_at: string
}

type SessionSummary = {
  id: string
  sessionId: string
  contextType: 'merger' | 'dcf' | 'general'
  createdAt: string
  updatedAt: string
  preview: string
  messages: MessageRow[]
}

function groupSessions(rows: MessageRow[]) {
  const grouped = new Map<string, SessionSummary>()

  rows.forEach((row) => {
    if (!grouped.has(row.session_id)) {
      grouped.set(row.session_id, {
        id: row.session_id,
        sessionId: row.session_id,
        contextType: row.context_type ?? 'general',
        createdAt: row.created_at,
        updatedAt: row.created_at,
        preview: row.content,
        messages: [],
      })
    }

    const session = grouped.get(row.session_id)!
    session.messages.push(row)
    session.updatedAt = row.created_at > session.updatedAt ? row.created_at : session.updatedAt
    if (row.role === 'assistant') {
      session.preview = row.content
    }
  })

  return Array.from(grouped.values()).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

function contextLabel(context: SessionSummary['contextType']) {
  if (context === 'merger') return 'Merger Analysis'
  if (context === 'dcf') return 'DCF Valuation'
  return 'General'
}

function contextHref(context: SessionSummary['contextType']) {
  if (context === 'merger') return '/merger-analysis'
  if (context === 'dcf') return '/dcf'
  return '/dashboard'
}

export function Chats() {
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    void loadHistory()
  }, [userId])

  async function loadHistory() {
    if (!userId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('ai_chat_history')
        .select('id, session_id, role, content, context_type, context_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(500)

      const grouped = groupSessions((data ?? []) as MessageRow[])
      setSessions(grouped)
      setSelectedSessionId((current) => current ?? grouped[0]?.sessionId ?? null)
    } finally {
      setLoading(false)
    }
  }

  const filteredSessions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sessions
    return sessions.filter((session) => `${contextLabel(session.contextType)} ${session.preview}`.toLowerCase().includes(needle))
  }, [query, sessions])

  const selectedSession = filteredSessions.find((session) => session.sessionId === selectedSessionId) ?? filteredSessions[0] ?? null
  const totalMessages = sessions.reduce((count, session) => count + session.messages.length, 0)

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>Execution / Analyst Chat</p>
            <h1 className='font-display text-4xl tracking-[-0.04em] text-text-primary'>Analyst Chat Archive</h1>
            <p className='mt-2 max-w-3xl font-ui text-sm text-text-secondary'>Review your AI Analyst sessions across merger, DCF, and general research contexts from one place.</p>
          </div>
          <Button variant='outline' asChild>
            <Link to='/dashboard'>Open Live AI Analyst</Link>
          </Button>
        </div>

        <div className='grid gap-4 md:grid-cols-3'>
          <PremiumCard accentColor='primary'><div className='space-y-2'><p className='font-ui text-[10px] uppercase tracking-[0.14em] text-text-muted'>Sessions</p><p className='font-mono text-4xl text-text-primary'>{sessions.length}</p></div></PremiumCard>
          <PremiumCard accentColor='cyan'><div className='space-y-2'><p className='font-ui text-[10px] uppercase tracking-[0.14em] text-text-muted'>Messages</p><p className='font-mono text-4xl text-text-primary'>{totalMessages}</p></div></PremiumCard>
          <PremiumCard accentColor='violet'><div className='space-y-2'><p className='font-ui text-[10px] uppercase tracking-[0.14em] text-text-muted'>Latest Context</p><p className='font-ui text-lg text-text-primary'>{selectedSession ? contextLabel(selectedSession.contextType) : 'No sessions yet'}</p></div></PremiumCard>
        </div>

        <div className='grid gap-6 lg:grid-cols-[320px_1fr]'>
          <PremiumCard accentColor='cyan'>
            <div className='space-y-4'>
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search AI sessions' className='border-border-subtle bg-bg-elevated' />
              <div className='space-y-2'>
                {loading ? <p className='font-ui text-sm text-text-secondary'>Loading conversations...</p> : null}
                {!loading && !filteredSessions.length ? <p className='font-ui text-sm text-text-secondary'>No AI sessions found yet. Open AI Analyst from a model page to start building history.</p> : null}
                {filteredSessions.map((session) => (
                  <button
                    key={session.sessionId}
                    type='button'
                    onClick={() => setSelectedSessionId(session.sessionId)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${selectedSession?.sessionId === session.sessionId ? 'border-accent-primary/40 bg-accent-primary/10' : 'border-border-subtle bg-bg-elevated hover:bg-bg-overlay'}`}
                  >
                    <div className='flex items-center justify-between gap-3'>
                      <span className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>{contextLabel(session.contextType)}</span>
                      <span className='font-ui text-xs text-text-secondary'>{new Date(session.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <p className='mt-2 line-clamp-2 font-ui text-sm text-text-primary'>{session.preview}</p>
                  </button>
                ))}
              </div>
            </div>
          </PremiumCard>

          <PremiumCard accentColor='primary'>
            {selectedSession ? (
              <div className='space-y-4'>
                <div className='flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle pb-4'>
                  <div>
                    <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Selected Session</p>
                    <h2 className='mt-1 font-display text-2xl text-text-primary'>{contextLabel(selectedSession.contextType)}</h2>
                    <p className='mt-2 font-ui text-sm text-text-secondary'>Started {new Date(selectedSession.createdAt).toLocaleString()}</p>
                  </div>
                  <Button variant='outline' asChild>
                    <Link to={contextHref(selectedSession.contextType)}>
                      Return to model
                      <ExternalLink className='ml-2 h-4 w-4' />
                    </Link>
                  </Button>
                </div>
                <div className='space-y-3'>
                  {selectedSession.messages.map((message) => (
                    <div key={message.id} className={`max-w-[85%] rounded-2xl border px-4 py-3 ${message.role === 'assistant' ? 'border-border-subtle bg-bg-elevated text-text-primary' : 'ml-auto border-accent-primary/30 bg-accent-primary text-white'}`}>
                      <div className='mb-2 flex items-center gap-2'>
                        {message.role === 'assistant' ? <BrainCircuit className='h-4 w-4 text-accent-cyan' /> : <Sparkles className='h-4 w-4 text-white/80' />}
                        <span className='font-ui text-[10px] uppercase tracking-[0.12em] opacity-80'>{message.role === 'assistant' ? 'AI Analyst' : 'You'}</span>
                      </div>
                      <p className='whitespace-pre-wrap font-ui text-sm leading-6'>{message.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className='flex min-h-[320px] flex-col items-center justify-center gap-4 text-center'>
                <div className='rounded-full border border-border-subtle bg-bg-elevated p-4'>
                  <MessageSquareText className='h-6 w-6 text-text-muted' />
                </div>
                <div>
                  <h2 className='font-display text-2xl text-text-primary'>No Analyst Chat history yet</h2>
                  <p className='mt-2 font-ui text-sm text-text-secondary'>Use the AI Analyst drawer on Merger Analysis or DCF to build a searchable archive here.</p>
                </div>
              </div>
            )}
          </PremiumCard>
        </div>
      </Main>
    </>
  )
}
