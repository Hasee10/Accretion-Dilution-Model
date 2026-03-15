import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'

type PresenceViewer = {
  user_id: string
  name: string
  avatar?: string | null
}

export function ViewerPresence({ channelKey }: { channelKey: string | null }) {
  const authUser = useAuthStore((state) => state.auth.user)
  const [viewers, setViewers] = useState<PresenceViewer[]>([])

  useEffect(() => {
    if (!channelKey || !authUser?.id) return

    const channel = supabase.channel(channelKey)

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const next = Object.values(state).flat().filter(Boolean) as PresenceViewer[]
        setViewers(next)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: authUser.id,
            name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Analyst',
            avatar: authUser.user_metadata?.avatar_url ?? null,
          })
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [authUser?.email, authUser?.id, authUser?.user_metadata, channelKey])

  const uniqueViewers = useMemo(
    () => Array.from(new Map(viewers.map((viewer) => [viewer.user_id, viewer])).values()),
    [viewers]
  )

  if (!channelKey || !uniqueViewers.length) return null

  return (
    <div className='flex items-center gap-3 rounded-full border border-border-subtle bg-bg-surface px-3 py-2'>
      <div className='flex -space-x-2'>
        {uniqueViewers.slice(0, 4).map((viewer) => (
          <div key={viewer.user_id} className='flex h-8 w-8 items-center justify-center rounded-full border border-bg-base bg-bg-elevated font-ui text-[11px] text-text-primary'>
            {viewer.avatar ? <img src={viewer.avatar} alt={viewer.name} className='h-full w-full rounded-full object-cover' /> : viewer.name.slice(0, 1).toUpperCase()}
          </div>
        ))}
      </div>
      <div className='flex items-center gap-2'>
        <Users className='h-4 w-4 text-text-muted' />
        <span className='font-ui text-xs text-text-secondary'>{uniqueViewers.length} people viewing</span>
      </div>
    </div>
  )
}
