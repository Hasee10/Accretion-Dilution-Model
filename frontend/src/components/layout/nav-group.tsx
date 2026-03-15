import { type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  type NavCollapsible,
  type NavItem,
  type NavLink,
  type NavGroup as NavGroupProps,
} from './types'

export function NavGroup({ title, items }: NavGroupProps) {
  const { state, isMobile } = useSidebar()
  const href = useLocation({ select: (location) => location.href })

  return (
    <SidebarGroup className='px-3 py-2'>
      <SidebarGroupLabel className='px-2 font-ui text-[9px] font-semibold uppercase tracking-[0.12em] text-text-muted'>
        {title}
      </SidebarGroupLabel>
      <SidebarMenu className='gap-1'>
        {items.map((item) => {
          const key = `${item.title}-${item.url ?? 'group'}`
          if (!item.items) return <SidebarMenuLink key={key} item={item} href={href} />
          if (state === 'collapsed' && !isMobile) {
            return <SidebarMenuCollapsedDropdown key={key} item={item} href={href} />
          }
          return <SidebarMenuCollapsible key={key} item={item} href={href} />
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function ShortcutHint({ children }: { children?: ReactNode }) {
  if (!children) return null
  return <span className='ml-auto font-mono text-[10px] text-text-muted'>{children}</span>
}

function BadgeHint({ children }: { children?: ReactNode }) {
  if (!children) return null
  return (
    <span className='ml-auto inline-flex items-center rounded-full border border-positive/20 bg-positive/10 px-2 py-0.5 font-ui text-[10px] uppercase tracking-[0.12em] text-positive'>
      {children}
    </span>
  )
}

function SidebarMenuLink({ item, href }: { item: NavLink; href: string }) {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(href, item)}
        tooltip={item.title}
        className='h-10 rounded-md border-l-2 border-transparent px-3 data-[active=true]:border-accent-primary data-[active=true]:bg-bg-elevated data-[active=true]:text-text-primary hover:bg-bg-surface'
      >
        <Link to={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon ? <item.icon className='size-4' /> : null}
          <span className='font-ui text-[13px]'>{item.title}</span>
          <BadgeHint>{item.badge}</BadgeHint>
          <ShortcutHint>{item.shortcut}</ShortcutHint>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarMenuCollapsible({ item, href }: { item: NavCollapsible; href: string }) {
  const { setOpenMobile } = useSidebar()
  return (
    <Collapsible asChild defaultOpen={checkIsActive(href, item, true)} className='group/collapsible'>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            className='h-10 rounded-md border-l-2 border-transparent px-3 data-[active=true]:border-accent-primary data-[active=true]:bg-bg-elevated hover:bg-bg-surface'
          >
            {item.icon ? <item.icon className='size-4' /> : null}
            <span className='font-ui text-[13px]'>{item.title}</span>
            <BadgeHint>{item.badge}</BadgeHint>
            <ShortcutHint>{item.shortcut}</ShortcutHint>
            <ChevronRight className='size-4 transition-transform group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className='CollapsibleContent'>
          <SidebarMenuSub className='ml-4 border-l border-border-subtle pl-3'>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={checkIsActive(href, subItem)}
                  className='h-9 rounded-md px-3 data-[active=true]:bg-bg-elevated data-[active=true]:text-text-primary hover:bg-bg-surface'
                >
                  <Link to={subItem.url} onClick={() => setOpenMobile(false)}>
                    {subItem.icon ? <subItem.icon className='size-4' /> : null}
                    <span className='font-ui text-[12px]'>{subItem.title}</span>
                    <ShortcutHint>{subItem.shortcut}</ShortcutHint>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function SidebarMenuCollapsedDropdown({ item, href }: { item: NavCollapsible; href: string }) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={checkIsActive(href, item)}
            className='h-10 rounded-md border-l-2 border-transparent px-3 data-[active=true]:border-accent-primary data-[active=true]:bg-bg-elevated hover:bg-bg-surface'
          >
            {item.icon ? <item.icon className='size-4' /> : null}
            <span>{item.title}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' sideOffset={8} className='min-w-52 rounded-lg border-border-subtle bg-bg-elevated'>
          <DropdownMenuLabel className='font-ui text-xs uppercase tracking-[0.12em] text-text-muted'>
            {item.title}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.items.map((sub) => (
            <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
              <Link to={sub.url} className={checkIsActive(href, sub) ? 'bg-bg-overlay' : ''}>
                {sub.icon ? <sub.icon className='size-4' /> : null}
                <span className='font-ui text-sm'>{sub.title}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function checkIsActive(href: string, item: NavItem, mainNav = false) {
  return (
    href === item.url ||
    href.split('?')[0] === item.url ||
    !!item?.items?.filter((entry) => entry.url === href).length ||
    (mainNav && href.split('/')[1] !== '' && href.split('/')[1] === item?.url?.split('/')[1])
  )
}
