import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  DetailFormRow,
  DetailFormSection,
  DetailNotFound,
  DetailPageShell,
  SingleSelectField,
} from '@/components/config-builder'
import { SchemaFormEditor } from '../../schema-form-editor'
import {
  getMetadataDescription,
  getEnumOptions,
  readBooleanInputValue,
  readInputValue,
  readNumberInputValue,
  setBooleanValue,
  setOptionalNumberValue,
  setOptionalStringValue,
} from '../lib/form-fields'
import { getChannelAccounts, getChannels, setChannelAccounts, summarizeAccount } from '../lib/channels-editor'
import { asObject } from '../lib/value-readers'
import { useChannelsEditor } from './channels-context'

type ChannelsAccountDetailProps = {
  routeChannelId: string
  routeAccountId: string
}

export function ChannelsAccountDetail({
  routeChannelId,
  routeAccountId,
}: ChannelsAccountDetailProps) {
  const navigate = useNavigate()
  const {
    value,
    onChange,
    onSave,
    isSaving,
    metadataMap,
    saveVersion,
    resolveAccountKey,
    setAccountRouteAlias,
    getAccountSchema,
  } = useChannelsEditor()
  const rootValue = getChannels(value)
  const channel = asObject(rootValue[routeChannelId])
  const accounts = getChannelAccounts(channel)
  const currentAccountId = resolveAccountKey(routeChannelId, routeAccountId)
  const account = asObject(accounts[currentAccountId])
  const [accountIdInput, setAccountIdInput] = useState(currentAccountId)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  useEffect(() => {
    setAccountIdInput(currentAccountId)
  }, [currentAccountId])

  useEffect(() => {
    if (!(currentAccountId in accounts)) {
      return
    }

    if (saveVersion > 1 && currentAccountId !== routeAccountId) {
      void navigate({
        to: '/channels/channel/$channelId/account/$accountId',
        params: {
          channelId: routeChannelId,
          accountId: currentAccountId,
        },
        replace: true,
      })
    }
  }, [
    accounts,
    currentAccountId,
    navigate,
    routeAccountId,
    routeChannelId,
    saveVersion,
  ])

  const summary = useMemo(() => {
    if (!(currentAccountId in accounts)) {
      return null
    }

    return summarizeAccount(
      currentAccountId,
      account,
      typeof channel.defaultAccount === 'string' ? channel.defaultAccount : undefined
    )
  }, [account, accounts, channel.defaultAccount, currentAccountId])

  if (!(routeChannelId in rootValue) || !(currentAccountId in accounts)) {
    return (
      <DetailNotFound
        title='Account not found'
        description='The selected account no longer exists in the current draft.'
        backLabel='Back to Channels'
        onBack={() => void navigate({ to: '/channels' })}
      />
    )
  }

  const updateAccount = (
    updater:
      | Record<string, unknown>
      | ((accountValue: Record<string, unknown>) => Record<string, unknown>)
  ) => {
    const nextAccount = typeof updater === 'function' ? updater(account) : updater

    onChange({
      ...rootValue,
      [routeChannelId]: setChannelAccounts(channel, {
        ...accounts,
        [currentAccountId]: nextAccount,
      }),
    })
  }

  const commitAccountId = () => {
    const nextAccountId = accountIdInput.trim()

    if (!nextAccountId) {
      toast.error('Account id is required')
      setAccountIdInput(currentAccountId)
      return
    }

    if (nextAccountId !== currentAccountId && nextAccountId in accounts) {
      toast.error('Account id must be unique in this channel')
      setAccountIdInput(currentAccountId)
      return
    }

    if (nextAccountId === currentAccountId) {
      setAccountRouteAlias(routeChannelId, routeAccountId, currentAccountId)
      return
    }

    const nextAccounts = {
      ...accounts,
    }
    delete nextAccounts[currentAccountId]
    nextAccounts[nextAccountId] = account

    onChange({
      ...rootValue,
      [routeChannelId]: setChannelAccounts(channel, nextAccounts),
    })
    setAccountRouteAlias(routeChannelId, routeAccountId, nextAccountId)
  }

  const enumOptions = {
    dmPolicy: getEnumOptions(
      metadataMap,
      `channels.${routeChannelId}.accounts.*.dmPolicy`
    ),
    groupPolicy: getEnumOptions(
      metadataMap,
      `channels.${routeChannelId}.accounts.*.groupPolicy`
    ),
    chunkMode: getEnumOptions(
      metadataMap,
      `channels.${routeChannelId}.accounts.*.chunkMode`
    ),
  }
  const accountSchema = getAccountSchema(routeChannelId)
  const omitKeys = [
    'name',
    'enabled',
    'dmPolicy',
    'groupPolicy',
    'historyLimit',
    'dmHistoryLimit',
    'chunkMode',
    'blockStreaming',
    'textChunkLimit',
    'mediaMaxMb',
    'serverUrl',
    'webhookPath',
  ]

  return (
    <DetailPageShell
      title={summary?.title ?? currentAccountId}
      description='Edit account-specific channel settings.'
      backLabel='Back to Channels'
      onBack={() => void navigate({ to: '/channels' })}
      actions={
        <Button
          type='button'
          onClick={() => void onSave()}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      }
    >
      <DetailFormSection
        advancedOpen={advancedOpen}
        onAdvancedOpenChange={setAdvancedOpen}
        advancedChildren={
          <div className='space-y-4'>
            <div className='grid gap-x-8 gap-y-0 xl:grid-cols-2'>
              <DetailFormRow
                label='Chunk Mode'
                description={getMetadataDescription(
                  metadataMap,
                  `channels.${routeChannelId}.accounts.*.chunkMode`
                )}
              >
                <SingleSelectField
                  options={enumOptions.chunkMode}
                  value={readInputValue(account.chunkMode)}
                  onChange={(nextValue) =>
                    updateAccount((current) =>
                      setOptionalStringValue(current, 'chunkMode', nextValue)
                    )
                  }
                />
              </DetailFormRow>
              <DetailFormRow
                label='Block Streaming'
                description={getMetadataDescription(
                  metadataMap,
                  `channels.${routeChannelId}.accounts.*.blockStreaming`
                )}
              >
                <div className='flex justify-end'>
                  <Switch
                    checked={readBooleanInputValue(account.blockStreaming, false)}
                    onCheckedChange={(checked) =>
                      updateAccount((current) =>
                        setBooleanValue(current, 'blockStreaming', checked)
                      )
                    }
                  />
                </div>
              </DetailFormRow>
              <DetailFormRow
                label='Text Chunk Limit'
                description={getMetadataDescription(
                  metadataMap,
                  `channels.${routeChannelId}.accounts.*.textChunkLimit`
                )}
              >
                <Input
                  type='number'
                  value={readNumberInputValue(account.textChunkLimit)}
                  onChange={(event) =>
                    updateAccount((current) =>
                      setOptionalNumberValue(
                        current,
                        'textChunkLimit',
                        event.target.value
                      )
                    )
                  }
                />
              </DetailFormRow>
              <DetailFormRow
                label='Media Max Mb'
                description={getMetadataDescription(
                  metadataMap,
                  `channels.${routeChannelId}.accounts.*.mediaMaxMb`
                )}
              >
                <Input
                  type='number'
                  value={readNumberInputValue(account.mediaMaxMb)}
                  onChange={(event) =>
                    updateAccount((current) =>
                      setOptionalNumberValue(
                        current,
                        'mediaMaxMb',
                        event.target.value
                      )
                    )
                  }
                />
              </DetailFormRow>
              <DetailFormRow
                label='Server Url'
                description={getMetadataDescription(
                  metadataMap,
                  `channels.${routeChannelId}.accounts.*.serverUrl`
                )}
              >
                <Input
                  value={readInputValue(account.serverUrl)}
                  onChange={(event) =>
                    updateAccount((current) =>
                      setOptionalStringValue(
                        current,
                        'serverUrl',
                        event.target.value
                      )
                    )
                  }
                />
              </DetailFormRow>
              <DetailFormRow
                label='Webhook Path'
                description={getMetadataDescription(
                  metadataMap,
                  `channels.${routeChannelId}.accounts.*.webhookPath`
                )}
              >
                <Input
                  value={readInputValue(account.webhookPath)}
                  onChange={(event) =>
                    updateAccount((current) =>
                      setOptionalStringValue(
                        current,
                        'webhookPath',
                        event.target.value
                      )
                    )
                  }
                />
              </DetailFormRow>
            </div>

            <SchemaFormEditor
              path={`channels.${routeChannelId}.accounts.${currentAccountId}`}
              schema={accountSchema}
              value={account}
              onChange={(nextValue) => updateAccount(asObject(nextValue))}
              layout='compact'
              descriptionMode='tooltip'
              showAllFields
              allowRemoveOptionalFields={false}
              compactFieldLayout='inline'
              omitKeys={omitKeys}
            />
          </div>
        }
      >
        <div className='grid gap-x-8 gap-y-0 xl:grid-cols-2'>
          <DetailFormRow
            label='ID'
            description='Stable account key within the selected channel provider.'
          >
            <Input
              value={accountIdInput}
              onChange={(event) => setAccountIdInput(event.target.value)}
              onBlur={commitAccountId}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitAccountId()
                }
              }}
            />
          </DetailFormRow>
          <DetailFormRow
            label='Name'
            description={getMetadataDescription(
              metadataMap,
              `channels.${routeChannelId}.accounts.*.name`
            )}
          >
            <Input
              value={readInputValue(account.name)}
              onChange={(event) =>
                updateAccount((current) =>
                  setOptionalStringValue(current, 'name', event.target.value)
                )
              }
            />
          </DetailFormRow>
          <DetailFormRow
            label='Enabled'
            description={getMetadataDescription(
              metadataMap,
              `channels.${routeChannelId}.accounts.*.enabled`
            )}
          >
            <div className='flex justify-end'>
              <Switch
                checked={readBooleanInputValue(account.enabled, true)}
                onCheckedChange={(checked) =>
                  updateAccount((current) =>
                    setBooleanValue(current, 'enabled', checked)
                  )
                }
              />
            </div>
          </DetailFormRow>
          <DetailFormRow
            label='DM Policy'
            description={getMetadataDescription(
              metadataMap,
              `channels.${routeChannelId}.accounts.*.dmPolicy`
            )}
          >
            <SingleSelectField
              options={enumOptions.dmPolicy}
              value={readInputValue(account.dmPolicy)}
              onChange={(nextValue) =>
                updateAccount((current) =>
                  setOptionalStringValue(current, 'dmPolicy', nextValue)
                )
              }
            />
          </DetailFormRow>
          <DetailFormRow
            label='Group Policy'
            description={getMetadataDescription(
              metadataMap,
              `channels.${routeChannelId}.accounts.*.groupPolicy`
            )}
          >
            <SingleSelectField
              options={enumOptions.groupPolicy}
              value={readInputValue(account.groupPolicy)}
              onChange={(nextValue) =>
                updateAccount((current) =>
                  setOptionalStringValue(current, 'groupPolicy', nextValue)
                )
              }
            />
          </DetailFormRow>
          <DetailFormRow
            label='History Limit'
            description={getMetadataDescription(
              metadataMap,
              `channels.${routeChannelId}.accounts.*.historyLimit`
            )}
          >
            <Input
              type='number'
              value={readNumberInputValue(account.historyLimit)}
              onChange={(event) =>
                updateAccount((current) =>
                  setOptionalNumberValue(
                    current,
                    'historyLimit',
                    event.target.value
                  )
                )
              }
            />
          </DetailFormRow>
          <DetailFormRow
            label='DM History Limit'
            description={getMetadataDescription(
              metadataMap,
              `channels.${routeChannelId}.accounts.*.dmHistoryLimit`
            )}
          >
            <Input
              type='number'
              value={readNumberInputValue(account.dmHistoryLimit)}
              onChange={(event) =>
                updateAccount((current) =>
                  setOptionalNumberValue(
                    current,
                    'dmHistoryLimit',
                    event.target.value
                  )
                )
              }
            />
          </DetailFormRow>
        </div>
      </DetailFormSection>
    </DetailPageShell>
  )
}
