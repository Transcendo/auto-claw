import {
  Bot,
  Boxes,
  Cable,
  Settings,
  Languages,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  teams: [],
  navGroups: [
    {
      title: 'Configuration',
      items: [
        {
          title: 'Models',
          url: '/models',
          icon: Boxes,
        },
        {
          title: 'Channels',
          url: '/channels',
          icon: Cable,
        },
        {
          title: 'Agents',
          url: '/agents',
          icon: Bot,
        },
      ],
    },
  ],
  footerMenu: {
    title: 'Settings',
    icon: Settings,
    items: [
      {
        title: 'Settings',
        url: '/settings',
        icon: Settings,
      },
      {
        title: 'Language',
        disabled: true,
        icon: Languages,
      },
    ],
  },
}
