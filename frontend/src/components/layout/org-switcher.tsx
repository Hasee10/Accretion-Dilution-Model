import { useEffect, useState } from 'react'
import { Check, ChevronDown, Plus, Building2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth-store'
import { useOrgStore } from '@/stores/org-store'
import { fetchUserOrganizations, switchCurrentOrganization } from '@/lib/supabase/orgs'
import { useOrgTheme } from '@/context/org-theme-provider'

type OrgOption = Awaited<ReturnType<typeof fetchUserOrganizations>>[number]

export function OrgSwitcher() {
  const userId = useAuthStore((state) => state.auth.user?.id ?? null)
  const currentOrg = useOrgStore((state) => state.currentOrg)
  const currentMembership = useOrgStore((state) => state.currentMembership)
  const { theme } = useOrgTheme()
  const [options, setOptions] = useState<OrgOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    void loadOptions()
  }, [userId, currentOrg?.id])

  async function loadOptions() {
    if (!userId) return
    try {
      setOptions(await fetchUserOrganizations(userId))
    } catch (error: any) {
      toast.error(error.message || 'Failed to load workspaces')
    }
  }

  async function handleSwitch(orgId: string | null, label: string) {
    if (!userId) return
    setLoading(true)
    try {
      await switchCurrentOrganization(userId, orgId)
      toast.success(`Switched to ${label}`)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to switch workspace')
    } finally {
      setLoading(false)
    }
  }

  const switchOptions = options.filter((option) => option.organization?.id !== currentOrg?.id)

  return (
    <div className='mb-3 rounded-lg border border-border-subtle bg-bg-surface p-3'>
      <p className='mb-2 font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Workspace</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='outline' className='w-full justify-between border-border-default bg-bg-elevated text-text-primary'>
            <span className='flex items-center gap-2 truncate'>
              {theme.logoUrl ? (
                <img src={theme.logoUrl} alt={theme.firmName} className='h-5 w-5 rounded object-cover' />
              ) : currentOrg ? (
                <Building2 className='h-4 w-4 text-accent-primary' />
              ) : (
                <UserRound className='h-4 w-4 text-accent-cyan' />
              )}
              <span className='truncate'>{currentOrg?.name ?? 'Personal Workspace'}</span>
            </span>
            <ChevronDown className='h-4 w-4 text-text-muted' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='min-w-72 rounded-lg border-border-subtle bg-bg-elevated text-text-primary' align='start'>
          <div className='px-2 py-1.5'>
            <p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Current Workspace</p>
          </div>
          <DropdownMenuItem disabled className='flex items-center justify-between'>
            <span>{currentOrg?.name ?? 'Personal Workspace'}</span>
            <span className='flex items-center gap-2 text-text-muted'>
              {currentMembership?.role ?? 'solo'}
              <Check className='h-4 w-4 text-positive' />
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className='px-2 py-1.5'>
            <p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Switch To</p>
          </div>
          {switchOptions.map((option) => (
            <DropdownMenuItem
              key={option.organization!.id}
              disabled={loading}
              onClick={() => void handleSwitch(option.organization!.id, option.organization!.name)}
              className='flex items-center justify-between'
            >
              <span>{option.organization!.name}</span>
              <span className='font-ui text-xs text-text-muted'>{option.membership.role}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem disabled={loading} onClick={() => void handleSwitch(null, 'Personal Workspace')}>
            Personal Workspace
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => window.location.assign('/register')}>
            <Plus className='mr-2 h-4 w-4' />
            Create new firm workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
