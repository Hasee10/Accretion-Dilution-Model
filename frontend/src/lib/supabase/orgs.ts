import { supabase } from './client'
import type { Organization, OrgInvitation, OrgMember } from './types'
import { useOrgStore } from '@/stores/org-store'

let warnedAboutMissingOrgSchema = false

function isMissingColumnError(message: string) {
  return message.includes('column profiles.current_org_id does not exist')
}

function isMissingTableError(message: string) {
  return (
    message.includes("Could not find the table 'public.organizations'") ||
    message.includes("Could not find the table 'public.org_members'") ||
    message.includes("Could not find the table 'public.org_invitations'")
  )
}

function warnOnce(message: string) {
  if (warnedAboutMissingOrgSchema) return
  warnedAboutMissingOrgSchema = true
  console.warn(message)
}

export function slugifyOrgName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export async function ensureUniqueOrgSlug(baseName: string) {
  const baseSlug = slugifyOrgName(baseName)
  let candidate = baseSlug
  let suffix = 1

  while (true) {
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()

    if (error) throw error
    if (!data) return candidate
    suffix += 1
    candidate = `${baseSlug}-${suffix}`
  }
}

export async function fetchCurrentOrgContext(userId: string | null) {
  if (!userId) {
    useOrgStore.getState().reset()
    return
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('current_org_id')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) {
    if (isMissingColumnError(profileError.message) || isMissingTableError(profileError.message)) {
      useOrgStore.getState().reset()
      warnOnce('Organization schema is not installed yet. Run the Chunk 9 SQL to enable firm workspaces.')
      return
    }
    console.warn('Failed to fetch current org id:', profileError.message)
    return
  }

  if (!profile?.current_org_id) {
    useOrgStore.getState().reset()
    return
  }

  const [orgResponse, memberResponse] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', profile.current_org_id).maybeSingle(),
    supabase.from('org_members').select('*').eq('org_id', profile.current_org_id).eq('user_id', userId).maybeSingle(),
  ])

  if (orgResponse.error) {
    console.warn('Failed to fetch organization:', orgResponse.error.message)
    return
  }

  if (memberResponse.error) {
    console.warn('Failed to fetch org membership:', memberResponse.error.message)
    return
  }

  useOrgStore.getState().setCurrentOrg((orgResponse.data as Organization | null) ?? null)
  useOrgStore.getState().setCurrentMembership((memberResponse.data as OrgMember | null) ?? null)
}

export async function lookupOrganizationByDomain(email: string) {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain) return null

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('domain', domain)
    .maybeSingle()

  if (error) {
    if (isMissingTableError(error.message)) {
      warnOnce('Organization lookup is unavailable until the Chunk 9 SQL is installed.')
      return null
    }
    throw error
  }
  return data as Organization | null
}

export async function lookupInvitationByToken(token: string) {
  const { data, error } = await supabase
    .from('org_invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (error) {
    if (isMissingTableError(error.message)) {
      warnOnce('Firm invitation lookup is unavailable until the Chunk 9 SQL is installed.')
      return null
    }
    throw error
  }
  return data as OrgInvitation | null
}

export async function fetchUserOrganizations(userId: string) {
  const membershipResponse = await supabase.from('org_members').select('*').eq('user_id', userId).eq('is_active', true)
  if (membershipResponse.error) {
    if (isMissingTableError(membershipResponse.error.message)) {
      warnOnce('Organization switcher is unavailable until the Chunk 9 SQL is installed.')
      return []
    }
    throw membershipResponse.error
  }

  const memberships = (membershipResponse.data as OrgMember[] | null) ?? []
  if (!memberships.length) return []

  const orgIds = memberships.map((entry) => entry.org_id)
  const orgResponse = await supabase.from('organizations').select('*').in('id', orgIds)
  if (orgResponse.error) throw orgResponse.error

  const orgsById = new Map(((orgResponse.data as Organization[] | null) ?? []).map((org) => [org.id, org]))
  return memberships
    .map((membership) => ({
      membership,
      organization: orgsById.get(membership.org_id) ?? null,
    }))
    .filter((entry) => entry.organization)
}

export async function switchCurrentOrganization(userId: string, orgId: string | null) {
  const { error } = await supabase.from('profiles').update({ current_org_id: orgId }).eq('id', userId)
  if (error) throw error
  await fetchCurrentOrgContext(userId)
}
