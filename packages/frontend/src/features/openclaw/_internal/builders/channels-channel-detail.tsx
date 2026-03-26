import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
import { getChannels, summarizeChannel } from '../lib/channels-editor'
import { asObject } from '../lib/value-readers'
import { useChannelsEditor } from './channels-context'

type ChannelsChannelDetailProps = {
  routeChannelId: string
}

export function ChannelsChannelDetail({
  routeChannelId,
}: ChannelsChannelDetailProps) {
  const navigate = useNavigate()
  const {
    value,
    onChange,
    onSave,
    isSaving,
    metadataMap,
    getChannelSchema,
  } = useChannelsEditor()
  const rootValue = getChannels(value)
  const channel = asObject(rootValue[routeChannelId])
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const channelSchema = getChannelSchema(routeChannelId)
  const summary = useMemo(() => {
    if (!(routeChannelId in rootValue)) {
      return null
    }

    return summarizeChannel(routeChannelId, channel)
  }, [channel, rootValue, routeChannelId])

  if (!(routeChannelId in rootValue)) {
    return (
      <DetailNotFound
        title='Channel not found'
        description='The selected channel no longer exists in the current draft.'
        backLabel='Back to Channels'
        onBack={() => void navigate({ to: '/channels' })}
      />
    )
  }

  const updateChannel = (
    updater:
      | Record<string, unknown>
      | ((channelValue: Record<string, unknown>) => Record<string, unknown>)
  ) => {
    const nextChannel = typeof updater === 'function' ? updater(channel) : updater

    onChange({
      ...rootValue,
      [routeChannelId]: nextChannel,
    })
  }

  const enumOptions = {
    dmPolicy: getEnumOptions(metadataMap, `channels.${routeChannelId}.dmPolicy`),
    groupPolicy: getEnumOptions(
      metadataMap,
      `channels.${routeChannelId}.groupPolicy`
    ),
    chunkMode: getEnumOptions(metadataMap, `channels.${routeChannelId}.chunkMode`),
  }

  const omitKeys = [
    'accounts',
    'enabled',
    'defaultAccount',
    'name',
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
      title={summary?.title ?? routeChannelId}
      description='Edit shared channel provider settings and defaults.'
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
                  `channels.${routeChannelId}.chunkMode`
                )}
              >
                <SingleSelectField
                  options={enumOptions.chunkMode}
                  value={readInputValue(channel.chunkMode)}
                  onChange={(nextValue) =>
                    updateChannel((current) =>
                      setOptionalStringValue(current, 'chunkMode', nextValue)
                    )
                  }
                />
              </DetailFormRow>
              <DetailFormRow
                label='Block Streaming'
                description={getMetadataDescription(
                  metadataMap,
                  `channels.${routeChannelId}.blockStreaming`
                )}
              >
                <div className='flex justify-end'>
                  <Switch
                    checked={readBooleanInputValue(channel.blockStreaming, false)}
                    onCheckedChange={(checked) =>
                      updateChannel((current) =>
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
                  `channels.${routeChannelId}.textChunkLimit`
                )}
              >
                <Input
                  type='number'
                  value={readNumberInputValue(channel.textChunkLimit)}
                  onChange={(event) =>
                    updateChannel((current) =>
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
                  `channels.${routeChannelId}.mediaMaxMb`
                )}
              >
                <Input
                  type='number'
                  value={readNumberInputValue(channel.mediaMaxMb)}
                  onChange={(event) =>
                    updateChannel((current) =>
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
                  `channels.${routeChannelId}.serverUrl`
                )}
              >
                <Input
                  value={readInputValue(channel.serverUrl)}
                  onChange={(event) =>
                    updateChannel((current) =>
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
                  `channels.${routeChannelId}.webhookPath`
                )}
              >
                <Input
                  value={readInputValue(channel.webhookPath)}
                  onChange={(event) =>
                    updateChannel((current) =>
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
              path={`channels.${routeChannelId}`}
              schema={channelSchema}
              value={channel}
              onChange={(nextValue) => updateChannel(asObject(nextValue))}
              layout='compact'
              descriptionMode='tooltip'
              showAllFields
              allowRemoveOptionalFields={false}
              compactFieldLayout='inline'
              hiddenPaths={[`channels.${routeChannelId}.accounts`]}
              omitKeys={omitKeys}
            />
          </div>
        }
      >
        <div className='grid gap-x-8 gap-y-0 xl:grid-cols-2'>
          <DetailFormRow
            label='Enabled'
            description={getMetadataDescription(
              metadataMap,
              `channels.${routeChannelId}.enabled`
            )}
          >
            <div className='flex justify-end'>
              <Switch
                checked={readBooleanInputValue(channel.enabled, true)}
                onCheckedChange={(checked) =>
                  updateChannel((current) =>
                    setBooleanValue(current, 'enabled', checked)
                  )
                }
              />
            </div>
          </DetailFormRow>
          <DetailFormRow
            label='Default Account'
            description={getMetadataDescription(
              metadataMap,
              `channels.${routeChannelId}.defaultAccount`
            )}
          >
            <Input
              value={readInputValue(channel.defaultAccount)}
              onChange={(event) =>
                updateChannel((current) =>
                  setOptionalStringValue(
                    current,
                    'defaultAccount',
                    event.target.value
                  )
                )
              }
            />
          </DetailFormRow>
          <DetailFormRow
            label='Name'
            description={getMetadataDescription(
              metadataMap,
              `channels.${routeChannelId}.name`
            )}
          >
            <Input
              value={readInputValue(channel.name)}
              onChange={(event) =>
                updateChannel((current) =>
                  setOptionalStringValue(current, 'name', event.target.value)
                )
              }
            />
          </DetailFormRow>
          <DetailFormRow
            label='DM Policy'
            description={getMetadataDescription(
              metadataMap,
              `channels.${routeChannelId}.dmPolicy`
            )}
          >
            <SingleSelectField
              options={enumOptions.dmPolicy}
              value={readInputValue(channel.dmPolicy)}
              onChange={(nextValue) =>
                updateChannel((current) =>
                  setOptionalStringValue(current, 'dmPolicy', nextValue)
                )
              }
            />
          </DetailFormRow>
          <DetailFormRow
            label='Group Policy'
            description={getMetadataDescription(
              metadataMap,
              `channels.${routeChannelId}.groupPolicy`
            )}
          >
            <SingleSelectField
              options={enumOptions.groupPolicy}
              value={readInputValue(channel.groupPolicy)}
              onChange={(nextValue) =>
                updateChannel((current) =>
                  setOptionalStringValue(current, 'groupPolicy', nextValue)
                )
              }
            />
          </DetailFormRow>
          <DetailFormRow
            label='History Limit'
            description={getMetadataDescription(
              metadataMap,
              `channels.${routeChannelId}.historyLimit`
            )}
          >
            <Input
              type='number'
              value={readNumberInputValue(channel.historyLimit)}
              onChange={(event) =>
                updateChannel((current) =>
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
              `channels.${routeChannelId}.dmHistoryLimit`
            )}
          >
            <Input
              type='number'
              value={readNumberInputValue(channel.dmHistoryLimit)}
              onChange={(event) =>
                updateChannel((current) =>
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
