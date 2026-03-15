import type { OrgRole } from '@/lib/supabase/types'

const ROLE_RANK: Record<OrgRole, number> = {
  owner: 6,
  admin: 5,
  vp: 4,
  associate: 3,
  analyst: 2,
  viewer: 1,
}

export const PERMISSIONS = {
  'deal.create': ['owner', 'admin', 'vp', 'associate', 'analyst'],
  'deal.edit.own': ['owner', 'admin', 'vp', 'associate', 'analyst'],
  'deal.edit.any': ['owner', 'admin', 'vp'],
  'deal.delete.own': ['owner', 'admin', 'vp', 'associate', 'analyst'],
  'deal.delete.any': ['owner', 'admin'],
  'deal.share.org': ['owner', 'admin', 'vp', 'associate'],
  'deal.share.public': ['owner', 'admin'],
  'member.invite': ['owner', 'admin'],
  'member.remove': ['owner', 'admin'],
  'member.role.change': ['owner', 'admin'],
  'member.view': ['owner', 'admin', 'vp', 'associate', 'analyst', 'viewer'],
  'org.settings.view': ['owner', 'admin'],
  'org.settings.edit': ['owner', 'admin'],
  'org.billing.view': ['owner'],
  'org.billing.edit': ['owner'],
  'org.branding.edit': ['owner', 'admin'],
  'org.delete': ['owner'],
  'ai.use': ['owner', 'admin', 'vp', 'associate', 'analyst'],
  'ai.history.view.all': ['owner', 'admin'],
  'export.pdf': ['owner', 'admin', 'vp', 'associate', 'analyst'],
  'export.excel': ['owner', 'admin', 'vp'],
} as const

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(userRole: OrgRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(userRole)
}

export function hasMinRole(userRole: OrgRole, minRole: OrgRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole]
}
