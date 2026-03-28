import {
  Bot,
  Boxes,
  Cable,
  Clock3,
  Fingerprint,
  Plug,
  Puzzle,
  Settings,
  Shield,
  Waypoints,
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
        {
          title: 'Env',
          url: '/env',
          icon: Fingerprint,
        },
        {
          title: 'Skills',
          url: '/skills',
          icon: Puzzle,
        },
        {
          title: 'Plugins',
          url: '/plugins',
          icon: Plug,
        },
        {
          title: 'Gateway',
          url: '/gateway',
          icon: Shield,
        },
        {
          title: 'Hooks',
          url: '/hooks',
          icon: Waypoints,
        },
        {
          title: 'MCP',
          url: '/mcp',
          icon: Boxes,
        },
        {
          title: 'Cron',
          url: '/cron',
          icon: Clock3,
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
