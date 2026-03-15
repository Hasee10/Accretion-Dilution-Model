import { Link } from '@tanstack/react-router'
import { Bell, ChevronsUpDown, LogOut, Settings } from 'lucide-react'
import useDialogState from '@/hooks/use-dialog-state'
import { useOrgStore } from '@/stores/org-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { SignOutDialog } from '@/components/sign-out-dialog'

type NavUserProps = {
  user: {
    name: string
    email: string
    avatar: string
  }
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()
  const [open, setOpen] = useDialogState()
  const currentOrg = useOrgStore((state) => state.currentOrg)
  const currentMembership = useOrgStore((state) => state.currentMembership)

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='h-14 rounded-lg border border-border-subtle bg-bg-surface px-3 hover:bg-bg-elevated data-[state=open]:bg-bg-elevated'
              >
                <Avatar className='h-9 w-9 rounded-full border border-border-subtle'>
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className='rounded-full bg-bg-overlay font-mono text-xs text-text-primary'>QE</AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left leading-tight'>
                  <span className='truncate font-ui text-[13px] font-medium text-text-primary'>{user.name}</span>
                  <span className='truncate font-ui text-[11px] text-text-secondary'>
                    {currentOrg ? `${currentOrg.sidebar_label ?? currentOrg.name} · ${currentMembership?.role ?? 'member'}` : user.email}
                  </span>
                </div>
                <ChevronsUpDown className='size-4 text-text-muted' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='min-w-56 rounded-lg border-border-subtle bg-bg-elevated text-text-primary'
              side={isMobile ? 'bottom' : 'right'}
              align='end'
              sideOffset={8}
            >
              <DropdownMenuItem asChild>
                <Link to='/settings'>
                  <Settings className='size-4' />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to='/settings/notifications'>
                  <Bell className='size-4' />
                  Notifications
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant='destructive' onClick={() => setOpen(true)}>
                <LogOut className='size-4' />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}

