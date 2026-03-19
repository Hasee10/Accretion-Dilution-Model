import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import {
  BarChart3,
  Bookmark,
  ChevronRight,
  Newspaper,
  Users2,
} from 'lucide-react'
import { z } from 'zod'
import { Logo } from '@/assets/logo'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: LandingPage,
})

const featureCards = [
  {
    title: 'Model live deals faster',
    description:
      'Run DCF, merger accretion/dilution, and LBO analysis. All models live in your workspace, version-controlled and shareable.',
    icon: BarChart3,
  },
  {
    title: 'Stay on top of the market',
    description:
      "Watchlists, ticker-linked news, and market-moving stories - contextually linked to the deals you're working on.",
    icon: Newspaper,
  },
  {
    title: 'Operate like a real firm',
    description:
      'Firm workspaces, shared model libraries, analyst tasking, and deal visibility controls built in from day one.',
    icon: Users2,
  },
]

const previewStats = [
  { label: 'Firm Plan', value: 'Free' },
  { label: 'Workspace Seats', value: '05 / 05' },
  { label: 'Shared Deals', value: '128' },
  { label: 'Model Library', value: '24 Active' },
]

const previewNav = [
  'Market News',
  'DCF Valuation',
  'Merger Analysis',
  'Watchlist',
  'Deal Tasks',
  'Bookmarks',
]

function LandingPage() {
  const { redirect: redirectTarget } = useSearch({ from: '/' })
  const navigate = useNavigate()
  const authSearch = redirectTarget ? { redirect: redirectTarget } : undefined

  function goToAuth(to: '/sign-in' | '/sign-up') {
    void navigate({ to, search: authSearch })
  }

  return (
    <div className='min-h-screen scroll-smooth bg-[#0A0A0B] text-white'>
      <div className='fixed inset-x-0 top-0 z-50 border-b border-white/6 bg-[rgba(10,10,11,0.85)] backdrop-blur-xl'>
        <div className='mx-auto flex h-18 max-w-7xl items-center justify-between px-6 md:px-10'>
          <Link to='/' className='flex items-center gap-3'>
            <div className='flex h-11 w-11 items-center justify-center rounded-xl border border-white/8 bg-[#111113]'>
              <Logo className='size-5 text-[#E8540A]' />
            </div>
            <div>
              <p className='font-display text-xl tracking-[-0.03em] text-white'>QuantEdge</p>
              <p className='font-ui text-[11px] uppercase tracking-[0.18em] text-[#888]'>Finance Intelligence Workspace</p>
            </div>
          </Link>

          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              className='text-white transition-all duration-200 ease-out hover:bg-white/6 hover:text-white'
              onClick={() => goToAuth('/sign-in')}
            >
              Sign in
            </Button>
            <Button
              className='bg-[#E8540A] text-white transition-all duration-200 ease-out hover:bg-[#F0641C]'
              onClick={() => goToAuth('/sign-up')}
            >
              Get started free
            </Button>
          </div>
        </div>
      </div>

      <main>
        <section className='relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-24 md:px-10'>
          <div
            className='absolute inset-0 opacity-35'
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '52px 52px',
            }}
          />
          <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(232,84,10,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(232,84,10,0.08),transparent_28%)]' />

          <div className='relative mx-auto flex max-w-5xl flex-col items-center text-center'>
            <div className='inline-flex items-center gap-2 rounded-full border border-white/8 bg-[#111113] px-4 py-2 text-sm text-[#C7C7CB] shadow-[0_0_0_1px_rgba(232,84,10,0.12)]'>
              <span className='h-2 w-2 rounded-full bg-[#E8540A]' />
              <span>Live modeling + research</span>
            </div>

            <h1 className='mt-8 max-w-4xl font-display text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-white md:text-7xl'>
              The workspace where finance teams model, research, and move faster.
            </h1>

            <p className='mt-6 max-w-[520px] font-ui text-lg leading-8 text-[#888]'>
              QuantEdge brings valuation models, market intelligence, and team collaboration into one system - so you stop switching between ten scattered tools.
            </p>

            <div className='mt-10 flex flex-col gap-3 sm:flex-row'>
              <Button
                size='lg'
                className='bg-[#E8540A] px-7 text-white transition-all duration-200 ease-out hover:bg-[#F0641C]'
                onClick={() => goToAuth('/sign-up')}
              >
                Get started free
              </Button>
              <Button
                size='lg'
                variant='outline'
                className='border-white/10 bg-transparent px-7 text-white transition-all duration-200 ease-out hover:border-white/20 hover:bg-white/6'
                onClick={() => goToAuth('/sign-in')}
              >
                Sign in
              </Button>
            </div>

            <p className='mt-4 font-ui text-sm text-[#555]'>Free plan available. No credit card required.</p>
          </div>
        </section>

        <section className='px-6 py-20 md:px-10'>
          <div className='mx-auto grid max-w-7xl gap-5 lg:grid-cols-3'>
            {featureCards.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className='rounded-xl border border-white/7 bg-[#111113] p-6 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-white/12'
                  style={{ boxShadow: 'inset 2px 0 0 rgba(232,84,10,0.6)' }}
                >
                  <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-[#18181C] text-[#E8540A]'>
                    <Icon className='h-5 w-5' />
                  </div>
                  <h2 className='mt-5 font-display text-2xl tracking-[-0.03em] text-white'>{feature.title}</h2>
                  <p className='mt-3 font-ui text-sm leading-7 text-[#888]'>{feature.description}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className='px-6 py-10 md:px-10'>
          <div className='mx-auto max-w-5xl'>
            <p className='font-ui text-[11px] uppercase tracking-[0.18em] text-[#555]'>What's inside</p>
            <div
              className='mt-5 rounded-[20px] border border-white/7 bg-[#111113] p-6 md:p-8'
              style={{ boxShadow: '0 0 0 1px rgba(232,84,10,0.2), 0 24px 48px rgba(0,0,0,0.6)' }}
            >
              <div className='grid gap-4 md:grid-cols-4'>
                {previewStats.map((stat) => (
                  <div key={stat.label} className='rounded-xl border border-white/7 bg-[#18181C] p-4'>
                    <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-[#555]'>{stat.label}</p>
                    <p className='mt-3 font-display text-2xl tracking-[-0.03em] text-white'>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className='mt-6 rounded-xl border border-white/7 bg-[#18181C] p-4'>
                <div className='flex flex-wrap gap-3'>
                  {previewNav.map((item, index) => (
                    <div
                      key={item}
                      className='inline-flex items-center gap-2 rounded-lg border border-white/7 bg-[#111113] px-3 py-2 text-sm text-[#C7C7CB]'
                    >
                      {index % 3 === 0 ? (
                        <Newspaper className='h-4 w-4 text-[#E8540A]' />
                      ) : index % 3 === 1 ? (
                        <BarChart3 className='h-4 w-4 text-[#E8540A]' />
                      ) : (
                        <Bookmark className='h-4 w-4 text-[#E8540A]' />
                      )}
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className='mt-16 bg-[#111113] px-6 py-20 md:px-10'>
          <div className='mx-auto flex max-w-4xl flex-col items-center text-center'>
            <h2 className='font-display text-4xl tracking-[-0.05em] text-white md:text-5xl'>Ready to run your first model?</h2>
            <Button
              size='lg'
              className='mt-8 bg-[#E8540A] px-7 text-white transition-all duration-200 ease-out hover:bg-[#F0641C]'
              onClick={() => goToAuth('/sign-up')}
            >
              Create free account
              <ChevronRight className='h-4 w-4' />
            </Button>
            <p className='mt-4 font-ui text-sm text-[#888]'>Takes 2 minutes. Your models stay private by default.</p>
          </div>
        </section>
      </main>

      <footer className='border-t border-white/6 px-6 py-8 md:px-10'>
        <div className='mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-[#111113]'>
              <Logo className='size-5 text-[#E8540A]' />
            </div>
            <div>
              <p className='font-display text-lg text-white'>QuantEdge</p>
              <p className='font-ui text-sm text-[#555]'>Finance intelligence workspace for front-office teams</p>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-4 font-ui text-sm text-[#888]'>
            <Link to='/terms' className='transition-colors duration-200 ease-out hover:text-white'>Terms of Service</Link>
            <Link to='/privacy' className='transition-colors duration-200 ease-out hover:text-white'>Privacy Policy</Link>
            <Link to='/documentation' className='transition-colors duration-200 ease-out hover:text-white'>Documentation</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
