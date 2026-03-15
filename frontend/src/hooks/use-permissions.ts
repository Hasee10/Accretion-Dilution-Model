import type { OrgRole } from '@/lib/supabase/types'
import { hasMinRole, hasPermission, type Permission } from '@/lib/permissions'
import { useOrgStore } from '@/stores/org-store'

export function usePermissions() {
  const userRole = (useOrgStore((state) => state.currentMembership?.role) ?? 'analyst') as OrgRole

  return {
    can: (permission: Permission) => hasPermission(userRole, permission),
    canMin: (minRole: OrgRole) => hasMinRole(userRole, minRole),
    role: userRole,
  }
}

export default usePermissions
