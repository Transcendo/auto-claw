import { asObject, compactSummary, readBoolean, readNestedObject, readString } from './value-readers'

export function getChannels(value: unknown) {
  return asObject(value)
}

export function getChannelAccounts(value: unknown) {
  return readNestedObject(value, 'accounts')
}

export function setChannelAccounts(
  channel: unknown,
  accounts: Record<string, unknown>
) {
  return {
    ...asObject(channel),
    accounts,
  }
}

export function summarizeChannel(channelId: string, value: unknown) {
  const channel = asObject(value)
  const accountCount = Object.keys(getChannelAccounts(channel)).length

  return {
    title: channelId,
    subtitle: readBoolean(channel, 'enabled') === false ? 'Disabled' : 'Configured',
    meta: compactSummary([
      readString(channel, 'defaultAccount')
        ? `Default: ${readString(channel, 'defaultAccount')}`
        : undefined,
      `${accountCount} account${accountCount === 1 ? '' : 's'}`,
    ]),
  }
}

export function summarizeAccount(
  accountId: string,
  value: unknown,
  defaultAccount?: string
) {
  const account = asObject(value)
  return {
    title: accountId,
    subtitle: readString(account, 'name') ?? 'Account settings',
    badges: compactSummary([
      readBoolean(account, 'enabled') === false ? 'Disabled' : 'Enabled',
      defaultAccount === accountId ? 'Default' : undefined,
    ]),
  }
}
