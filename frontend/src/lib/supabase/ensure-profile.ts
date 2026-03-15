import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './client'

function buildFallbackName(user: User) {
  const metaName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.display_name

  if (typeof metaName === 'string' && metaName.trim()) return metaName.trim()
  if (user.email) return user.email.split('@')[0]
  return 'QuantEdge User'
}

export async function ensureProfileForUser(user: User | null) {
  if (!user || !user.id || !user.email) return

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.warn('Profile lookup failed:', error.message)
    return
  }

  if (data) return

  const { error: insertError } = await supabase.from('profiles').insert({
    id: user.id,
    full_name: buildFallbackName(user),
    email: user.email,
    company: typeof user.user_metadata?.company === 'string' ? user.user_metadata.company : null,
    role: 'analyst',
    avatar_url: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
  } as never)

  if (insertError) {
    console.warn('Profile bootstrap failed:', insertError.message)
  }
}

export async function ensureProfileForSession(session: Session | null) {
  await ensureProfileForUser(session?.user ?? null)
}
