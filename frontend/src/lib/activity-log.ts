import { supabase } from '@/lib/supabase/client'

type ActivityPayload = {
  orgId: string | null
  userId: string | null
  action: string
  resourceType?: string | null
  resourceId?: string | null
  metadata?: Record<string, unknown> | null
}

export async function logActivity({
  orgId,
  userId,
  action,
  resourceType = null,
  resourceId = null,
  metadata = null,
}: ActivityPayload) {
  if (!orgId || !userId) return

  const { error } = await supabase.from('activity_log').insert({
    org_id: orgId,
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata,
    ip_address: null,
  } as never)

  if (error) {
    console.warn('Activity log insert failed:', error.message)
  }
}
