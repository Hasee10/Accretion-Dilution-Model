import { type ElementType } from 'react'
import {
  Bell,
  Bookmark,
  Building2,
  HelpCircle,
  History,
  LayoutDashboard,
  MessagesSquare,
  Newspaper,
  Package,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react'
import { type SidebarData } from '../types'
import modulesConfig from '@/data/modules.json'

const iconMap: Record<string, ElementType> = {
  LayoutDashboard,
  TrendingUp,
  History,
}

const moduleGroups = Array.isArray(modulesConfig) ? modulesConfig : [modulesConfig]

const modelItems = moduleGroups.flatMap((group) =>
  group.items.map((item) => ({
    title: item.title,
    url: item.url,
    icon: iconMap[item.icon] || TrendingUp,
    shortcut:
      item.url === '/merger-analysis'
        ? 'G M'
        : item.url === '/lbo-model'
          ? 'G L'
        : item.url === '/dcf'
          ? 'G D'
        : item.url === '/history'
            ? 'G H'
            : item.url === '/firm-library'
              ? 'G F'
            : undefined,
  }))
).filter((item) => item.url !== '/news' && item.url !== '/bookmarks')

export const sidebarData: SidebarData = {
  user: {
    name: 'QuantEdge Analyst',
    email: 'terminal@quantedge.ai',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [],
  navGroups: [
    {
      title: 'Intelligence',
      items: [
        {
          title: 'Market News',
          url: '/news',
          icon: Newspaper,
          badge: 'Live',
        },
        {
          title: 'Bookmarks',
          url: '/bookmarks',
          icon: Bookmark,
        },
      ],
    },
    {
      title: 'Financial Intelligence',
      items: modelItems,
    },
    {
      title: 'Execution',
      items: [
        {
          title: 'Deal Tasks',
          url: '/tasks',
          icon: Package,
          shortcut: 'G T',
        },
        {
          title: 'Team Directory',
          url: '/users',
          icon: Users,
        },
        {
          title: 'Analyst Chat',
          url: '/chats',
          icon: MessagesSquare,
          shortcut: 'Cmd+K',
        },
      ],
    },
    {
      title: 'Platform',
      items: [
        {
          title: 'Admin Console',
          url: '/admin',
          icon: Building2,
        },
        {
          title: 'Notifications',
          url: '/settings/notifications',
          icon: Bell,
        },
        {
          title: 'Settings',
          url: '/settings',
          icon: Settings,
          shortcut: 'S',
        },
        {
          title: 'Help Center',
          url: '/help-center',
          icon: HelpCircle,
        },
      ],
    },
  ],
}

