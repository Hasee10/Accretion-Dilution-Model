import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

type LegalSection = {
  title: string
  body: string[]
}

type LegalShellProps = {
  eyebrow: string
  title: string
  summary: string
  effectiveDate: string
  sections: LegalSection[]
}

export function LegalShell({
  eyebrow,
  title,
  summary,
  effectiveDate,
  sections,
}: LegalShellProps) {
  return (
    <div className='min-h-screen overflow-hidden bg-bg-base text-text-primary'>
      <div className='absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px] opacity-15' />
      <div className='absolute left-1/2 top-16 h-[20rem] w-[20rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.22),rgba(6,6,8,0))] blur-3xl' />

      <div className='relative mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14'>
        <Button variant='outline' asChild className='mb-8 border-border-default bg-bg-surface'>
          <Link to='/sign-up'>
            <ArrowLeft className='mr-2 h-4 w-4' />
            Back to Sign Up
          </Link>
        </Button>

        <div className='grid gap-8 lg:grid-cols-[260px_1fr]'>
          <aside className='space-y-5 lg:sticky lg:top-10 lg:self-start'>
            <div className='rounded-2xl border border-border-subtle bg-bg-surface p-5'>
              <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>{eyebrow}</p>
              <h1 className='mt-3 font-display text-4xl tracking-[-0.04em] text-text-primary'>{title}</h1>
              <p className='mt-4 font-ui text-sm leading-6 text-text-secondary'>{summary}</p>
              <div className='mt-6 rounded-xl border border-border-subtle bg-bg-elevated px-3 py-3'>
                <p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Effective Date</p>
                <p className='mt-1 font-mono text-sm text-text-primary'>{effectiveDate}</p>
              </div>
            </div>

            <div className='rounded-2xl border border-border-subtle bg-bg-surface p-5'>
              <p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Sections</p>
              <div className='mt-4 space-y-2'>
                {sections.map((section, index) => (
                  <a
                    key={section.title}
                    href={`#section-${index + 1}`}
                    className='block rounded-lg border border-transparent px-3 py-2 font-ui text-sm text-text-secondary transition hover:border-border-subtle hover:bg-bg-elevated hover:text-text-primary'
                  >
                    {index + 1}. {section.title}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <main className='rounded-3xl border border-border-subtle bg-bg-surface p-6 md:p-8'>
            <div className='space-y-8'>
              {sections.map((section, index) => (
                <section
                  key={section.title}
                  id={`section-${index + 1}`}
                  className='border-b border-border-subtle pb-8 last:border-b-0 last:pb-0'
                >
                  <div className='mb-4 flex items-center gap-3'>
                    <span className='inline-flex h-8 w-8 items-center justify-center rounded-full border border-accent-primary/30 bg-accent-primary/10 font-mono text-xs text-accent-primary'>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h2 className='font-display text-2xl tracking-[-0.02em] text-text-primary'>{section.title}</h2>
                  </div>
                  <div className='space-y-4'>
                    {section.body.map((paragraph, paragraphIndex) => (
                      <p key={`${section.title}-${paragraphIndex}`} className='max-w-3xl font-ui text-[15px] leading-7 text-text-secondary'>
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default LegalShell
