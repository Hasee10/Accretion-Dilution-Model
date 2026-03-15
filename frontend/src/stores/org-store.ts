import { create } from 'zustand'
import type { Organization, OrgMember } from '@/lib/supabase/types'

interface OrgState {
  currentOrg: Organization | null
  currentMembership: OrgMember | null
  setCurrentOrg: (org: Organization | null) => void
  setCurrentMembership: (member: OrgMember | null) => void
  reset: () => void
}

export const useOrgStore = create<OrgState>()((set) => ({
  currentOrg: null,
  currentMembership: null,
  setCurrentOrg: (currentOrg) => set({ currentOrg }),
  setCurrentMembership: (currentMembership) => set({ currentMembership }),
  reset: () => set({ currentOrg: null, currentMembership: null }),
}))
