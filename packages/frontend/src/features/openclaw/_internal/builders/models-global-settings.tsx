import { useMemo } from 'react'
import type { OpenClawModelsSection } from '@/types/openclaw'
import {
  DetailFormRow,
  MultiSelectField,
  SingleSelectField,
} from '@/components/config-builder'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  getEnumOptions,
  getMetadataDescription,
  readBooleanInputValue,
  readInputValue,
  readNumberInputValue,
  readStringArrayValue,
  setBooleanValue,
  setOptionalNumberValue,
  setOptionalStringValue,
  setStringArrayValue,
  type ModelsMetadataMap,
} from '../lib/models-fields'
import { asObject } from '../lib/value-readers'

type ModelsGlobalSettingsProps = {
  value: OpenClawModelsSection
  metadataMap: ModelsMetadataMap
  providerIds: string[]
  onChange: (value: OpenClawModelsSection) => void
  onSave: (value?: OpenClawModelsSection) => Promise<boolean>
  wrapped?: boolean
}

export function ModelsGlobalSettings({
  value,
  metadataMap,
  providerIds,
  onChange,
  onSave,
  wrapped = true,
}: ModelsGlobalSettingsProps) {
  const rootValue = asObject(value)
  const bedrockDiscovery = asObject(rootValue.bedrockDiscovery)

  const modeOptions = useMemo(
    () => getEnumOptions(metadataMap, 'models.mode'),
    [metadataMap]
  )
  const providerFilterOptions = useMemo(
    () => providerIds.map((providerId) => ({ label: providerId, value: providerId })),
    [providerIds]
  )

  const applyUpdate = async (
    updater: (currentValue: Record<string, unknown>) => Record<string, unknown>
  ) => {
    const nextValue = updater(rootValue)
    onChange(nextValue)
    const saved = await onSave(nextValue)
    if (!saved) {
      onChange(value)
    }
  }

  const updateBedrockDiscovery = async (
    updater: (currentValue: Record<string, unknown>) => Record<string, unknown>
  ) => {
    await applyUpdate((currentValue) => ({
      ...currentValue,
      bedrockDiscovery: updater(asObject(currentValue.bedrockDiscovery)),
    }))
  }

  const commitRegion = async (nextValue: string) => {
    await updateBedrockDiscovery((currentDiscovery) =>
      setOptionalStringValue(currentDiscovery, 'region', nextValue)
    )
  }

  const commitRefreshInterval = async (nextValue: string) => {
    await updateBedrockDiscovery((currentDiscovery) =>
      setOptionalNumberValue(currentDiscovery, 'refreshInterval', nextValue)
    )
  }

  const commitDefaultContextWindow = async (nextValue: string) => {
    await updateBedrockDiscovery((currentDiscovery) =>
      setOptionalNumberValue(
        currentDiscovery,
        'defaultContextWindow',
        nextValue
      )
    )
  }

  const commitDefaultMaxTokens = async (nextValue: string) => {
    await updateBedrockDiscovery((currentDiscovery) =>
      setOptionalNumberValue(
        currentDiscovery,
        'defaultMaxTokens',
        nextValue
      )
    )
  }

  const content = (
    <div className='grid gap-x-8 gap-y-0 xl:grid-cols-2'>
        <DetailFormRow
          label='Mode'
          description={getMetadataDescription(metadataMap, 'models.mode')}
        >
          <SingleSelectField
            options={modeOptions}
            value={readInputValue(rootValue.mode)}
            onChange={(nextValue) =>
              void applyUpdate((currentValue) => ({
                ...currentValue,
                mode: nextValue,
              }))
            }
            placeholder='Select catalog mode'
          />
        </DetailFormRow>

        <DetailFormRow
          label='Bedrock Discovery Enabled'
          description={getMetadataDescription(
            metadataMap,
            'models.bedrockDiscovery.enabled'
          )}
        >
          <div className='flex justify-end'>
            <Switch
              checked={readBooleanInputValue(bedrockDiscovery.enabled, false)}
              onCheckedChange={(checked) =>
                void updateBedrockDiscovery((currentDiscovery) =>
                  setBooleanValue(currentDiscovery, 'enabled', checked)
                )
              }
            />
          </div>
        </DetailFormRow>

        <DetailFormRow
          label='Bedrock Discovery Region'
          description={getMetadataDescription(
            metadataMap,
            'models.bedrockDiscovery.region'
          )}
        >
          <Input
            key={`bedrock-region-${readInputValue(bedrockDiscovery.region)}`}
            defaultValue={readInputValue(bedrockDiscovery.region)}
            onBlur={(event) => void commitRegion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void commitRegion(event.currentTarget.value)
              }
            }}
          />
        </DetailFormRow>

        <DetailFormRow
          label='Bedrock Discovery Refresh Interval'
          description={getMetadataDescription(
            metadataMap,
            'models.bedrockDiscovery.refreshInterval'
          )}
        >
          <Input
            type='number'
            key={`bedrock-refresh-${readNumberInputValue(bedrockDiscovery.refreshInterval)}`}
            defaultValue={readNumberInputValue(bedrockDiscovery.refreshInterval)}
            onBlur={(event) => void commitRefreshInterval(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void commitRefreshInterval(event.currentTarget.value)
              }
            }}
          />
        </DetailFormRow>

        <DetailFormRow
          label='Bedrock Default Context Window'
          description={getMetadataDescription(
            metadataMap,
            'models.bedrockDiscovery.defaultContextWindow'
          )}
        >
          <Input
            type='number'
            key={`bedrock-context-${readNumberInputValue(bedrockDiscovery.defaultContextWindow)}`}
            defaultValue={readNumberInputValue(
              bedrockDiscovery.defaultContextWindow
            )}
            onBlur={(event) => void commitDefaultContextWindow(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void commitDefaultContextWindow(event.currentTarget.value)
              }
            }}
          />
        </DetailFormRow>

        <DetailFormRow
          label='Bedrock Default Max Tokens'
          description={getMetadataDescription(
            metadataMap,
            'models.bedrockDiscovery.defaultMaxTokens'
          )}
        >
          <Input
            type='number'
            key={`bedrock-max-${readNumberInputValue(bedrockDiscovery.defaultMaxTokens)}`}
            defaultValue={readNumberInputValue(bedrockDiscovery.defaultMaxTokens)}
            onBlur={(event) => void commitDefaultMaxTokens(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void commitDefaultMaxTokens(event.currentTarget.value)
              }
            }}
          />
        </DetailFormRow>

        <DetailFormRow
          label='Bedrock Discovery Provider Filter'
          description={getMetadataDescription(
            metadataMap,
            'models.bedrockDiscovery.providerFilter'
          )}
          className='xl:col-span-2'
        >
          <MultiSelectField
            options={providerFilterOptions}
            value={readStringArrayValue(bedrockDiscovery.providerFilter)}
            onChange={(nextValue) =>
              void updateBedrockDiscovery((currentDiscovery) => {
                if (nextValue.length === 0) {
                  const nextRecord = {
                    ...currentDiscovery,
                  }
                  delete nextRecord.providerFilter
                  return nextRecord
                }

                return setStringArrayValue(
                  currentDiscovery,
                  'providerFilter',
                  nextValue
                )
              })
            }
            placeholder='Select providers'
          />
        </DetailFormRow>
    </div>
  )

  if (!wrapped) {
    return content
  }

  return (
    <div className='rounded-2xl border border-border/60 bg-background/80 p-4 sm:p-5'>
      {content}
    </div>
  )
}
