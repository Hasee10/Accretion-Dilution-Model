import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Logo } from '@/assets/logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='min-h-screen bg-[#0A0A0B] text-white'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(232,84,10,0.12),transparent_22%),linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:auto,48px_48px,48px_48px]' />
      <div className='relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 md:px-10'>
        <div className='flex items-center justify-between border-b border-white/6 pb-6'>
          <Link to='/' className='flex items-center gap-3'>
            <div className='flex h-11 w-11 items-center justify-center rounded-xl border border-white/8 bg-[#111113]'>
              <Logo className='size-5 text-[#E8540A]' />
            </div>
            <div>
              <p className='font-display text-2xl tracking-[-0.03em] text-white'>QuantEdge</p>
              <p className='font-ui text-[11px] uppercase tracking-[0.16em] text-[#888]'>Finance intelligence workspace</p>
            </div>
          </Link>

          <Link
            to='/'
            className='inline-flex items-center gap-2 rounded-lg border border-white/8 bg-[#111113] px-4 py-2 text-sm text-[#C7C7CB] transition-all duration-200 ease-out hover:border-white/14 hover:text-white'
          >
            <ArrowLeft className='h-4 w-4' />
            Back to home
          </Link>
        </div>

        <div className='flex flex-1 items-center justify-center py-12'>
          <div className='w-full max-w-md'>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
