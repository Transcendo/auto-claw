import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getObjectPropertySchema } from '@/lib/json-schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  AdvancedSection,
  DetailFormRow,
  DetailPageShell,
  EditorDialog,
  KeyValueEditorDialog,
  MultiSelectField,
  SingleSelectField,
} from '@/components/config-builder'
import { SchemaFormEditor } from '../../schema-form-editor'
import {
  getModelByIndex,
  getProviders,
  replaceProviderModel,
  setProviders,
  summarizeModel,
} from '../lib/models-editor'
import {
  compactConfigValue,
  getMetadataDescription,
  getModelApiOptions,
  getModelInputOptions,
  parseKeyValueRows,
  readBooleanInputValue,
  readInputValue,
  readKeyValueRows,
  readNestedValue,
  readNumberInputValue,
  readStringArrayValue,
  setBooleanValue,
  setNestedOptionalNumberValue,
  setOptionalNumberValue,
} from '../lib/models-fields'
import { asObject } from '../lib/value-readers'
import { useModelsEditor } from './models-context'

type ModelsModelDetailProps = {
  routeProviderId: string
  routeModelId: string
}

function ModelNotFound({ onBack }: { onBack: () => void }) {
  return (
    <DetailPageShell
      title='Model not found'
      description='The selected model no longer exists in the current draft.'
      backLabel='Back to Models'
      onBack={onBack}
    >
      <div className='rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground'>
        Return to the Models overview and select another model card.
      </div>
    </DetailPageShell>
  )
}

export function ModelsModelDetail({
  routeProviderId,
  routeModelId,
}: ModelsModelDetailProps) {
  const navigate = useNavigate()
  const {
    value,
    onChange,
    onSave,
    isSaving,
    modelSchema,
    metadataMap,
    saveVersion,
    resolveProviderKey,
    resolveModelIndex,
  } = useModelsEditor()
  const rootValue = asObject(value)
  const providers = getProviders(rootValue)
  const currentProviderId = resolveProviderKey(routeProviderId)
  const provider = asObject(providers[currentProviderId])
  const modelIndex = resolveModelIndex(routeProviderId, routeModelId)
  const model = asObject(getModelByIndex(provider, modelIndex))
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [headersOpen, setHeadersOpen] = useState(false)
  const [compatOpen, setCompatOpen] = useState(false)
  const [compatDraft, setCompatDraft] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (modelIndex < 0) {
      return
    }

    if (saveVersion > 1) {
      const latestModelId = readInputValue(
        asObject(getModelByIndex(provider, modelIndex)).id
      )
      if (
        currentProviderId !== routeProviderId ||
        (latestModelId && latestModelId !== routeModelId)
      ) {
        void navigate({
          to: '/models/provider/$providerId/model/$modelId',
          params: {
            providerId: currentProviderId,
            modelId: latestModelId || routeModelId,
          },
          replace: true,
        })
      }
    }
  }, [
    currentProviderId,
    modelIndex,
    navigate,
    provider,
    routeModelId,
    routeProviderId,
    saveVersion,
  ])

  const modelSummary = useMemo(() => {
    if (modelIndex < 0) {
      return null
    }

    return summarizeModel(model)
  }, [model, modelIndex])

  const modelApiOptions = getModelApiOptions(metadataMap)
  const modelInputOptions = getModelInputOptions()
  const compatSchema = getObjectPropertySchema(modelSchema, 'compat')

  if (!(currentProviderId in providers) || modelIndex < 0) {
    return <ModelNotFound onBack={() => void navigate({ to: '/models' })} />
  }

  const updateModel = (
    updater:
      | Record<string, unknown>
      | ((modelValue: Record<string, unknown>) => Record<string, unknown>)
  ) => {
    const nextModel = typeof updater === 'function' ? updater(model) : updater

    onChange(
      setProviders(rootValue, {
        ...providers,
        [currentProviderId]: replaceProviderModel(
          provider,
          modelIndex,
          nextModel
        ),
      })
    )
  }

  return (
    <>
      <DetailPageShell
        title={modelSummary?.title ?? routeModelId}
        description='Edit the model definition and runtime capabilities.'
        backLabel='Back to Models'
        onBack={() => void navigate({ to: '/models' })}
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
        <div className='grid gap-x-8 gap-y-0 xl:grid-cols-2'>
          <DetailFormRow
            label='ID'
            description={getMetadataDescription(
              metadataMap,
              'models.providers.*.models.*.id'
            )}
          >
            <Input
              value={readInputValue(model.id)}
              onChange={(event) =>
                updateModel((currentModel) => ({
                  ...currentModel,
                  id: event.target.value,
                }))
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='Name'
            description={getMetadataDescription(
              metadataMap,
              'models.providers.*.models.*.name'
            )}
          >
            <Input
              value={readInputValue(model.name)}
              onChange={(event) =>
                updateModel((currentModel) => ({
                  ...currentModel,
                  name: event.target.value,
                }))
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='API'
            description={getMetadataDescription(
              metadataMap,
              'models.providers.*.models.*.api'
            )}
          >
            <SingleSelectField
              options={modelApiOptions}
              value={
                readInputValue(model.api) ||
                readInputValue(provider.api) ||
                modelApiOptions[0]?.value ||
                'openai-completions'
              }
              onChange={(nextValue) =>
                updateModel((currentModel) => ({
                  ...currentModel,
                  api: nextValue,
                }))
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='REASONING'
            description={getMetadataDescription(
              metadataMap,
              'models.providers.*.models.*.reasoning'
            )}
          >
            <div className='flex justify-end'>
              <Switch
                checked={readBooleanInputValue(model.reasoning, false)}
                onCheckedChange={(checked) =>
                  updateModel((currentModel) =>
                    setBooleanValue(currentModel, 'reasoning', checked)
                  )
                }
              />
            </div>
          </DetailFormRow>

          <DetailFormRow
            label='Context Window'
            description={getMetadataDescription(
              metadataMap,
              'models.providers.*.models.*.contextWindow'
            )}
          >
            <Input
              type='number'
              value={readNumberInputValue(model.contextWindow)}
              onChange={(event) =>
                updateModel((currentModel) =>
                  setOptionalNumberValue(
                    currentModel,
                    'contextWindow',
                    event.target.value
                  )
                )
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='Max Token'
            description={getMetadataDescription(
              metadataMap,
              'models.providers.*.models.*.maxTokens'
            )}
          >
            <Input
              type='number'
              value={readNumberInputValue(model.maxTokens)}
              onChange={(event) =>
                updateModel((currentModel) =>
                  setOptionalNumberValue(
                    currentModel,
                    'maxTokens',
                    event.target.value
                  )
                )
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='Input'
            description={getMetadataDescription(
              metadataMap,
              'models.providers.*.models.*.input'
            )}
          >
            <MultiSelectField
              options={modelInputOptions}
              value={readStringArrayValue(model.input, ['text'])}
              onChange={(nextValue) =>
                updateModel((currentModel) => ({
                  ...currentModel,
                  input: nextValue,
                }))
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='Cost'
            description={getMetadataDescription(
              metadataMap,
              'models.providers.*.models.*.cost'
            )}
            className='xl:col-span-2'
            contentClassName='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'
          >
            {[
              ['input', 'Input'],
              ['output', 'Output'],
              ['cacheRead', 'Cache Read'],
              ['cacheWrite', 'Cache Write'],
            ].map(([key, label]) => (
              <div key={key} className='space-y-2'>
                <Label className='text-xs text-muted-foreground'>{label}</Label>
                <Input
                  type='number'
                  value={readNumberInputValue(
                    readNestedValue(model, 'cost', key)
                  )}
                  onChange={(event) =>
                    updateModel((currentModel) =>
                      setNestedOptionalNumberValue(
                        currentModel,
                        'cost',
                        key,
                        event.target.value
                      )
                    )
                  }
                />
              </div>
            ))}
          </DetailFormRow>
        </div>

        <AdvancedSection open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <div className='grid gap-x-8 gap-y-0 xl:grid-cols-2'>
            <DetailFormRow
              label='Compat'
              description={getMetadataDescription(
                metadataMap,
                'models.providers.*.models.*.compat'
              )}
            >
              <div className='flex items-center justify-between gap-3'>
                <span className='text-sm text-muted-foreground'>
                  {Object.keys(asObject(model.compat)).length} configured
                </span>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setCompatDraft(asObject(model.compat))
                    setCompatOpen(true)
                  }}
                >
                  Configure
                </Button>
              </div>
            </DetailFormRow>

            <DetailFormRow
              label='Header'
              description={getMetadataDescription(
                metadataMap,
                'models.providers.*.models.*.headers'
              )}
            >
              <div className='flex items-center justify-between gap-3'>
                <span className='text-sm text-muted-foreground'>
                  {Object.keys(asObject(model.headers)).length} configured
                </span>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setHeadersOpen(true)}
                >
                  Configure
                </Button>
              </div>
            </DetailFormRow>
          </div>
        </AdvancedSection>
      </DetailPageShell>

      <KeyValueEditorDialog
        open={headersOpen}
        onOpenChange={setHeadersOpen}
        title='Model Header'
        description='Configure request headers as key/value pairs.'
        rows={readKeyValueRows(model.headers)}
        onApply={async (rows) => {
          const nextHeaders = parseKeyValueRows(rows)

          const nextValue = setProviders(rootValue, {
            ...providers,
            [currentProviderId]: replaceProviderModel(provider, modelIndex, (() => {
              const nextModel = {
                ...model,
              }

              if (!nextHeaders) {
                delete nextModel.headers
                return nextModel
              }

              nextModel.headers = nextHeaders
              return nextModel
            })()),
          })

          onChange(nextValue)
          const saved = await onSave(nextValue)
          if (saved) {
            setHeadersOpen(false)
          }
        }}
        isSaving={isSaving}
      />

      <EditorDialog
        open={compatOpen}
        onOpenChange={setCompatOpen}
        title='Model Compat'
        description='Configure protocol compatibility flags and overrides.'
        footer={
          <>
            <Button
              type='button'
              variant='outline'
              onClick={() => setCompatOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type='button'
              disabled={isSaving}
              onClick={async () => {
                const nextCompat = compactConfigValue(compatDraft)

                const nextValue = setProviders(rootValue, {
                  ...providers,
                  [currentProviderId]: replaceProviderModel(
                    provider,
                    modelIndex,
                    (() => {
                      const nextModel = {
                        ...model,
                      }

                      if (!nextCompat || typeof nextCompat !== 'object') {
                        delete nextModel.compat
                        return nextModel
                      }

                      nextModel.compat = nextCompat
                      return nextModel
                    })()
                  ),
                })

                onChange(nextValue)
                const saved = await onSave(nextValue)
                if (saved) {
                  setCompatOpen(false)
                }
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <SchemaFormEditor
          path='models.providers.*.models.*.compat'
          schema={compatSchema}
          value={compatDraft}
          onChange={(nextValue) => setCompatDraft(asObject(nextValue))}
          layout='compact'
          descriptionMode='tooltip'
          showAllFields
          allowRemoveOptionalFields={false}
          compactFieldLayout='inline'
          compactBooleanColumns
        />
      </EditorDialog>
    </>
  )
}
