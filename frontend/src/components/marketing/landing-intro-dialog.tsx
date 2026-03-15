import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const STORAGE_KEY = 'quantedge-landing-dialog-dismissed'

const offerHighlights = [
  'Interactive DCF, merger accretion / dilution, and LBO modeling workspaces',
  'Firm workspaces with shared libraries, watchlists, news, and analyst collaboration',
  'AI-assisted context, ticker-linked insights, and finance-focused research workflows',
]

const termsHighlights = [
  'Use of market data and AI outputs should be reviewed before investment decisions.',
  'By creating an account, users agree to the Terms of Service and Privacy Policy.',
  'QuantEdge is designed for research and workflow support, not regulated advice.',
]

export function LandingIntroDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const dismissed = window.localStorage.getItem(STORAGE_KEY)
    if (!dismissed) {
      const timer = window.setTimeout(() => setOpen(true), 500)
      return () => window.clearTimeout(timer)
    }
  }, [])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen && typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-2xl border-border-default bg-bg-surface text-text-primary'>
        <DialogHeader className='text-left'>
          <Badge className='mb-3 w-fit border-emerald-500/30 bg-emerald-500/10 text-emerald-300' variant='outline'>
            Welcome to QuantEdge
          </Badge>
          <DialogTitle className='font-display text-3xl tracking-[-0.04em] text-text-primary'>
            A deal team workspace, not just a login screen.
          </DialogTitle>
          <DialogDescription className='text-sm leading-6 text-text-secondary'>
            QuantEdge brings valuation, M&amp;A, LBO, market intelligence, watchlists, and analyst collaboration into one operating layer for finance teams.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-6 md:grid-cols-2'>
          <div className='rounded-2xl border border-border-subtle bg-bg-elevated/70 p-5'>
            <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>What we offer</p>
            <div className='mt-4 space-y-3 text-sm text-text-secondary'>
              {offerHighlights.map((item) => (
                <div key={item} className='flex gap-3'>
                  <span className='mt-1 h-2 w-2 rounded-full bg-accent-primary' />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className='rounded-2xl border border-border-subtle bg-bg-elevated/70 p-5'>
            <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>Before you continue</p>
            <div className='mt-4 space-y-3 text-sm text-text-secondary'>
              {termsHighlights.map((item) => (
                <div key={item} className='flex gap-3'>
                  <span className='mt-1 h-2 w-2 rounded-full bg-accent-cyan' />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className='flex-col gap-3 sm:flex-row sm:justify-between'>
          <div className='flex items-center gap-4 text-sm text-text-muted'>
            <Link to='/terms' className='underline underline-offset-4 hover:text-text-primary'>
              Terms of Service
            </Link>
            <Link to='/privacy' className='underline underline-offset-4 hover:text-text-primary'>
              Privacy Policy
            </Link>
          </div>
          <div className='flex w-full gap-3 sm:w-auto'>
            <Button variant='outline' className='flex-1 border-border-default bg-bg-surface sm:flex-none' asChild>
              <Link to='/sign-in'>Sign In</Link>
            </Button>
            <Button className='flex-1 sm:flex-none' onClick={() => handleOpenChange(false)}>
              Explore QuantEdge
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
