export interface HelloPayload {
  message: string
  time: string
}

export function buildGreeting(name: string) {
  return `Hello, ${name}!`
}

export function formatBackendStatus(payload?: HelloPayload) {
  if (!payload) {
    return {
      title: 'Waiting',
      subtitle: 'Waiting for server response',
    }
  }

  return {
    title: payload.message,
    subtitle: `Updated at ${payload.time}`,
  }
}

export * from './errors'
export * from './app-config'
export * from './environments'
export * from './settings'
export * from './openclaw/config'
export * from './openclaw/metadata'
export * from './openclaw/service'
export * from './openclaw/types'
export * from './openclaw/validate'
