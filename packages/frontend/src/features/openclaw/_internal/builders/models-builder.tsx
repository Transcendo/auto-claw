import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useDialogDraft } from '@/hooks/use-dialog-draft'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  EditorDialog,
  EntityCard,
  EntityGrid,
} from '@/components/config-builder'
import { SchemaFormEditor } from '../../schema-form-editor'
import {
  appendProviderModel,
  createDefaultModelValue,
  createDefaultProviderValue,
  getNextModelId,
  getNextProviderId,
  getProviderModels,
  getProviders,
  removeProviderKey,
  removeProviderModel,
  setProviders,
  summarizeModel,
  summarizeProvider,
} from '../lib/models-editor'
import { asObject } from '../lib/value-readers'
import { useModelsEditor } from './models-context'

export function ModelsBuilder() {
  const navigate = useNavigate()
  const {
    value,
    onChange,
    onSave,
    isSaving,
    globalSchema,
    providerSchema,
    modelSchema,
  } = useModelsEditor()
  const rootValue = asObject(value)
  const providers = getProviders(rootValue)
  const providerEntries = Object.entries(providers)
  const [selectedProviderId, setSelectedProviderId] = useState(
    providerEntries[0]?.[0] ?? ''
  )
  const globalDialog = useDialogDraft<Record<string, unknown>>()
  const activeProviderId =
    selectedProviderId && selectedProviderId in providers
      ? selectedProviderId
      : (providerEntries[0]?.[0] ?? '')

  const activeProvider = activeProviderId
    ? asObject(providers[activeProviderId])
    : undefined
  const activeProviderSummary = useMemo(() => {
    if (!activeProviderId || !activeProvider) {
      return null
    }

    return summarizeProvider(activeProviderId, activeProvider)
  }, [activeProvider, activeProviderId])

  const openGlobalSettings = () => {
    globalDialog.openEdit(
      {
        bedrockDiscovery: asObject(rootValue.bedrockDiscovery),
        mode: rootValue.mode,
      },
      undefined
    )
  }

  const addProvider = async () => {
    if (!providerSchema) {
      return
    }

    const providerId = getNextProviderId(rootValue)
    const nextProviders = {
      ...providers,
      [providerId]: createDefaultProviderValue(providerSchema),
    }

    const nextValue = setProviders(rootValue, nextProviders)

    onChange(nextValue)
    setSelectedProviderId(providerId)
    const saved = await onSave(nextValue)
    if (!saved) {
      onChange(rootValue)
      setSelectedProviderId(activeProviderId)
      return
    }

    void navigate({
      to: '/models/provider/$providerId',
      params: { providerId },
    })
  }

  const removeActiveProvider = async () => {
    if (!activeProviderId) {
      return
    }

    const nextValue = setProviders(
      rootValue,
      removeProviderKey(providers, activeProviderId)
    )
    onChange(nextValue)
    const saved = await onSave(nextValue)
    if (!saved) {
      onChange(rootValue)
      return
    }

    void navigate({ to: '/models' })
  }

  const addModel = async () => {
    if (!activeProviderId || !activeProvider || !modelSchema) {
      return
    }

    const modelId = getNextModelId(activeProvider)
    const nextProvider = appendProviderModel(activeProvider, {
      ...createDefaultModelValue(modelSchema, activeProvider),
      id: modelId,
      name: modelId,
    })

    const nextValue = setProviders(rootValue, {
      ...providers,
      [activeProviderId]: nextProvider,
    })

    onChange(nextValue)
    const saved = await onSave(nextValue)
    if (!saved) {
      onChange(rootValue)
      return
    }

    void navigate({
      to: '/models/provider/$providerId/model/$modelId',
      params: {
        providerId: activeProviderId,
        modelId,
      },
    })
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='space-y-1'>
          <h2 className='text-lg font-semibold tracking-tight'>Providers</h2>
          <p className='text-sm text-muted-foreground'>
            Switch tabs to browse providers, then jump into detail pages for
            editing.
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={openGlobalSettings}
            disabled={isSaving}
          >
            Global Settings
          </Button>
          <Button type='button' onClick={() => void addProvider()} disabled={isSaving}>
            Add Provider
          </Button>
        </div>
      </div>

      {providerEntries.length === 0 ? (
        <EntityGrid
          emptyTitle='No providers yet'
          emptyDescription='Add a provider to start configuring models.'
        />
      ) : (
        <div className='space-y-5'>
          <Tabs value={activeProviderId} onValueChange={setSelectedProviderId}>
            <TabsList className='w-full justify-start overflow-x-auto'>
              {providerEntries.map(([providerId]) => (
                <TabsTrigger
                  key={providerId}
                  value={providerId}
                  className='flex-none'
                >
                  {providerId}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {activeProvider && activeProviderSummary && (
            <div className='space-y-5 rounded-2xl border border-border/60 bg-background/80 p-4 sm:p-5'>
              <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                <div className='space-y-1'>
                  <h3 className='text-lg font-semibold'>
                    {activeProviderSummary.title}
                  </h3>
                  <p className='text-sm text-muted-foreground'>
                    {activeProviderSummary.subtitle}
                  </p>
                  {activeProviderSummary.meta.length > 0 && (
                    <p className='text-xs text-muted-foreground'>
                      {activeProviderSummary.meta.join(' · ')}
                    </p>
                  )}
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() =>
                      navigate({
                        to: '/models/provider/$providerId',
                        params: { providerId: activeProviderId },
                      })
                    }
                  >
                    Edit Provider
                  </Button>
                  <Button
                    type='button'
                    onClick={() => void addModel()}
                    disabled={isSaving}
                  >
                    Add Model
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    onClick={() => void removeActiveProvider()}
                    disabled={isSaving}
                  >
                    Remove Provider
                  </Button>
                </div>
              </div>

              <EntityGrid
                emptyTitle='No models yet'
                emptyDescription='Add a model inside the current provider.'
              >
                {getProviderModels(activeProvider).map(
                  (modelValue, modelIndex) => {
                    const modelSummary = summarizeModel(modelValue)
                    const modelId = modelSummary.subtitle

                    return (
                      <EntityCard
                        key={`${activeProviderId}-${modelId}-${modelIndex}`}
                        title={modelSummary.title}
                        subtitle={modelSummary.subtitle}
                        badges={modelSummary.badges.map((label) => ({ label }))}
                        onClick={() =>
                          navigate({
                            to: '/models/provider/$providerId/model/$modelId',
                            params: {
                              providerId: activeProviderId,
                              modelId,
                            },
                          })
                        }
                        actions={
                          <>
                            <Button
                              type='button'
                              size='sm'
                              variant='outline'
                              onClick={() =>
                                navigate({
                                  to: '/models/provider/$providerId/model/$modelId',
                                  params: {
                                    providerId: activeProviderId,
                                    modelId,
                                  },
                                })
                              }
                            >
                              Details
                            </Button>
                            <Button
                              type='button'
                              size='sm'
                              variant='ghost'
                              onClick={async () => {
                                const nextValue = setProviders(rootValue, {
                                  ...providers,
                                  [activeProviderId]: removeProviderModel(
                                    activeProvider,
                                    modelIndex
                                  ),
                                })

                                onChange(nextValue)
                                const saved = await onSave(nextValue)
                                if (!saved) {
                                  onChange(rootValue)
                                }
                              }}
                              disabled={isSaving}
                            >
                              Remove
                            </Button>
                          </>
                        }
                      />
                    )
                  }
                )}
              </EntityGrid>
            </div>
          )}
        </div>
      )}

      <EditorDialog
        open={globalDialog.isOpen}
        onOpenChange={(open) => !open && globalDialog.close()}
        title='Model Global Settings'
        description='Edit top-level merge mode and Bedrock discovery settings.'
        footer={
          <>
            <Button
              type='button'
              variant='outline'
              onClick={globalDialog.close}
            >
              Cancel
            </Button>
            <Button
              type='button'
              disabled={isSaving}
              onClick={async () => {
                if (!globalDialog.state) {
                  return
                }

                const nextValue = {
                  ...rootValue,
                  ...globalDialog.state.draft,
                }

                onChange(nextValue)
                const saved = await onSave(nextValue)
                if (saved) {
                  globalDialog.close()
                }
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        {globalDialog.state && (
          <SchemaFormEditor
            path='models'
            schema={globalSchema}
            value={globalDialog.state.draft}
            onChange={(nextValue) =>
              globalDialog.updateDraft(
                asObject(nextValue) as Record<string, unknown>
              )
            }
            layout='compact'
            descriptionMode='tooltip'
          />
        )}
      </EditorDialog>
    </div>
  )
}
