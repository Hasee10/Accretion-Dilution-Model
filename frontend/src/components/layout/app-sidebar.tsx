import { Command, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { OrgSwitcher } from './org-switcher'
import { NavUser } from './nav-user'
import { useOrgStore } from '@/stores/org-store'
import { useAuthStore } from '@/stores/auth-store'
import { hasMinRole } from '@/lib/permissions'
import { useOrgTheme } from '@/context/org-theme-provider'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'

export function AppSidebar() {
  const sidebar = useSidebar()
  const { collapsible, variant } = useLayout()
  const currentOrg = useOrgStore((state) => state.currentOrg)
  const currentMembership = useOrgStore((state) => state.currentMembership)
  const authUser = useAuthStore((state) => state.auth.user)
  const { theme } = useOrgTheme()
  const shellUser = {
    name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || sidebarData.user.name,
    email: authUser?.email || sidebarData.user.email,
    avatar: currentOrg?.logo_url || sidebarData.user.avatar,
  }

  const filteredNavGroups = sidebarData.navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.url !== '/admin') return true
      const role = currentMembership?.role
      return !!role && hasMinRole(role, 'admin')
    }),
  })).filter((group) => group.items.length > 0)

  return (
    <Sidebar collapsible={collapsible} variant={variant} className='border-r border-sidebar-border'>
      <SidebarHeader className='gap-4 border-b border-border-subtle px-3 py-4'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-3 overflow-hidden'>
            <div className='flex h-9 w-9 items-center justify-center rounded-md border border-accent-primary/30 bg-accent-primary/10'>
              {theme.logoUrl ? (
                <img src={theme.logoUrl} alt={theme.firmName} className='h-6 w-6 rounded object-contain' />
              ) : (
                <span className='font-display text-sm font-bold tracking-[0.14em] text-accent-primary'>{theme.firmName.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className='min-w-0 group-data-[collapsible=icon]:hidden'>
              <p className='font-display text-lg font-semibold tracking-[0.01em] text-text-primary'>{currentOrg?.sidebar_label ?? theme.firmName}</p>
              <p className='font-ui text-[11px] uppercase tracking-[0.12em] text-text-muted'>
                {currentOrg ? `${currentOrg.plan} workspace` : 'Market Intelligence'}
              </p>
            </div>
          </div>

          <button
            type='button'
            onClick={sidebar.toggleSidebar}
            className='rounded-md border border-border-subtle bg-bg-surface p-2 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary group-data-[collapsible=icon]:hidden'
          >
            {sidebar.state === 'expanded' ? <PanelLeftClose className='size-4' /> : <PanelLeftOpen className='size-4' />}
          </button>
        </div>

        <div className='flex items-center justify-between rounded-md border border-border-subtle bg-bg-surface px-3 py-2 group-data-[collapsible=icon]:hidden'>
          <div>
            <p className='font-ui text-[10px] uppercase tracking-[0.12em] text-text-muted'>Global Search</p>
            <p className='font-ui text-xs text-text-secondary'>Jump across models and settings</p>
          </div>
          <div className='flex items-center gap-1 rounded border border-border-subtle bg-bg-elevated px-2 py-1 font-mono text-[10px] text-text-secondary'>
            <Command className='size-3' />
            K
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className='gap-0 py-2'>
        {filteredNavGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
      </SidebarContent>

      <SidebarFooter className='border-t border-border-subtle p-3'>
        <OrgSwitcher />
        <NavUser user={shellUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
