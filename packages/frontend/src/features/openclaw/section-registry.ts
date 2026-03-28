import type { OpenClawConfigSectionKey } from '@/types/openclaw'

export type OpenClawPageSectionKey = Exclude<
  OpenClawConfigSectionKey,
  'bindings'
>

export type OpenClawSectionDefinition = {
  sectionKey: OpenClawPageSectionKey
  title: string
  description: string
  route: string
  queryKey: string
  rawPath: string
  builderKind: 'generic' | 'models' | 'channels' | 'agents'
}

export const openClawSectionDefinitions: OpenClawSectionDefinition[] = [
  {
    sectionKey: 'models',
    title: 'Models',
    description:
      'Manage providers, model definitions, and related model capabilities for the selected environment.',
    route: '/models',
    queryKey: 'config-models',
    rawPath: 'inmemory://openclaw/models.json',
    builderKind: 'models',
  },
  {
    sectionKey: 'channels',
    title: 'Channels',
    description:
      'Configure built-in channel integrations, account-level settings, and custom extension channels.',
    route: '/channels',
    queryKey: 'config-channels',
    rawPath: 'inmemory://openclaw/channels.json',
    builderKind: 'channels',
  },
  {
    sectionKey: 'agents',
    title: 'Agents',
    description:
      'Manage agent defaults, individual agent instances, and the bindings that connect agents to channels.',
    route: '/agents',
    queryKey: 'config-agents',
    rawPath: 'inmemory://openclaw/agents.json',
    builderKind: 'agents',
  },
  {
    sectionKey: 'env',
    title: 'Env',
    description:
      'Configure runtime environment imports, explicit variable overrides, and shell environment loading behavior.',
    route: '/env',
    queryKey: 'config-env',
    rawPath: 'inmemory://openclaw/env.json',
    builderKind: 'generic',
  },
  {
    sectionKey: 'skills',
    title: 'Skills',
    description:
      'Manage skill loading, installation preferences, limits, and per-skill environment or API key overrides.',
    route: '/skills',
    queryKey: 'config-skills',
    rawPath: 'inmemory://openclaw/skills.json',
    builderKind: 'generic',
  },
  {
    sectionKey: 'plugins',
    title: 'Plugins',
    description:
      'Control plugin loading, allow and deny lists, plugin entries, and install metadata for the selected environment.',
    route: '/plugins',
    queryKey: 'config-plugins',
    rawPath: 'inmemory://openclaw/plugins.json',
    builderKind: 'generic',
  },
  {
    sectionKey: 'gateway',
    title: 'Gateway',
    description:
      'Configure gateway bind mode, auth, control UI, HTTP compatibility endpoints, remote transport, and safety controls.',
    route: '/gateway',
    queryKey: 'config-gateway',
    rawPath: 'inmemory://openclaw/gateway.json',
    builderKind: 'generic',
  },
  {
    sectionKey: 'hooks',
    title: 'Hooks',
    description:
      'Manage inbound hook auth, mappings, Gmail integration, presets, and internal hook runtime settings.',
    route: '/hooks',
    queryKey: 'config-hooks',
    rawPath: 'inmemory://openclaw/hooks.json',
    builderKind: 'generic',
  },
  {
    sectionKey: 'mcp',
    title: 'MCP',
    description:
      'Define global MCP servers managed by OpenClaw for runtime adapters and embedded agents.',
    route: '/mcp',
    queryKey: 'config-mcp',
    rawPath: 'inmemory://openclaw/mcp.json',
    builderKind: 'generic',
  },
  {
    sectionKey: 'cron',
    title: 'Cron',
    description:
      'Tune scheduler behavior, delivery fallback, retries, run logs, and session retention for stored cron jobs.',
    route: '/cron',
    queryKey: 'config-cron',
    rawPath: 'inmemory://openclaw/cron.json',
    builderKind: 'generic',
  },
]

export const openClawSectionDefinitionMap = new Map(
  openClawSectionDefinitions.map((definition) => [
    definition.sectionKey,
    definition,
  ])
)

export function getOpenClawSectionDefinition(sectionKey: OpenClawPageSectionKey) {
  const definition = openClawSectionDefinitionMap.get(sectionKey)
  if (!definition) {
    throw new Error(`Unknown OpenClaw section: ${sectionKey}`)
  }

  return definition
}
