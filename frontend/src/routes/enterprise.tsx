import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export const Route = createFileRoute('/enterprise')({
  component: EnterprisePage,
})

function EnterprisePage() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
  const [form, setForm] = useState({ company: '', email: '', teamSize: '11-25', message: '' })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await axios.post(`${apiBaseUrl}/api/v1/enterprise/contact`, form)
      toast.success('We will be in touch within 1 business day.')
      setForm({ company: '', email: '', teamSize: '11-25', message: '' })
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to submit enterprise inquiry')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='min-h-screen bg-bg-base text-text-primary'>
      <div className='mx-auto max-w-6xl px-6 py-16 md:px-10'>
        <div className='grid gap-10 lg:grid-cols-[1.05fr_0.95fr]'>
          <section>
            <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-text-muted'>QuantEdge Enterprise</p>
            <h1 className='mt-4 font-display text-5xl tracking-[-0.05em] text-text-primary'>QuantEdge for Enterprise Teams</h1>
            <p className='mt-6 max-w-2xl font-ui text-lg text-text-secondary'>SSO-ready workspace controls, unlimited seats, custom onboarding, SLA-backed support, and a modeling stack shaped for larger advisory teams.</p>
            <div className='mt-10 grid gap-4 md:grid-cols-2'>
              {['SSO / SAML', 'Unlimited seats', 'Custom onboarding', 'Dedicated support', 'Priority roadmap input', 'Enterprise governance'].map((item) => (
                <div key={item} className='rounded-xl border border-border-subtle bg-bg-surface p-4 font-ui text-sm text-text-secondary'>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className='rounded-2xl border border-border-subtle bg-bg-surface p-6'>
            <p className='font-ui text-[11px] uppercase tracking-[0.14em] text-text-muted'>Contact Sales</p>
            <h2 className='mt-2 font-display text-3xl text-text-primary'>Tell us about your team</h2>
            <form className='mt-6 space-y-4' onSubmit={handleSubmit}>
              <Input value={form.company} onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))} placeholder='Company name' className='border-border-subtle bg-bg-elevated text-text-primary' required />
              <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder='Work email' type='email' className='border-border-subtle bg-bg-elevated text-text-primary' required />
              <select value={form.teamSize} onChange={(event) => setForm((current) => ({ ...current, teamSize: event.target.value }))} className='flex h-10 w-full rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-ui text-sm text-text-primary'>
                <option value='1-10'>1-10</option>
                <option value='11-25'>11-25</option>
                <option value='26-50'>26-50</option>
                <option value='51-100'>51-100</option>
                <option value='100+'>100+</option>
              </select>
              <Textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder='Tell us about your workflow, compliance needs, and rollout timeline.' className='min-h-[160px] border-border-subtle bg-bg-elevated text-text-primary' required />
              <Button type='submit' disabled={submitting} className='w-full'>
                {submitting ? 'Sending...' : 'Contact QuantEdge'}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
