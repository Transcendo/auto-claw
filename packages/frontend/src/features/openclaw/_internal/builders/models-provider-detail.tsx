import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  AdvancedSection,
  DetailFormRow,
  DetailPageShell,
  KeyValueEditorDialog,
  SingleSelectField,
} from '@/components/config-builder'
import {
  getProviders,
  renameProviderKey,
  setProviders,
  summarizeProvider,
} from '../lib/models-editor'
import {
  getMetadataDescription,
  getProviderApiOptions,
  getProviderAuthOptions,
  parseJsonLikeValue,
  parseKeyValueRows,
  readBooleanInputValue,
  readInputValue,
  readKeyValueRows,
  stripFieldPrefix,
  formatJsonLikeValue,
  setBooleanValue,
  setOptionalStringValue,
} from '../lib/models-fields'
import { asObject } from '../lib/value-readers'
import { useModelsEditor } from './models-context'

type ModelsProviderDetailProps = {
  routeProviderId: string
}

function ProviderNotFound({ onBack }: { onBack: () => void }) {
  return (
    <DetailPageShell
      title='Provider not found'
      description='The selected provider no longer exists in the current draft.'
      backLabel='Back to Models'
      onBack={onBack}
    >
      <div className='rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground'>
        Return to the Models overview and pick another provider tab.
      </div>
    </DetailPageShell>
  )
}

export function ModelsProviderDetail({
  routeProviderId,
}: ModelsProviderDetailProps) {
  const navigate = useNavigate()
  const {
    value,
    onChange,
    onSave,
    isSaving,
    metadataMap,
    saveVersion,
    resolveProviderKey,
    setProviderRouteAlias,
  } = useModelsEditor()
  const rootValue = asObject(value)
  const providers = getProviders(rootValue)
  const currentProviderId = resolveProviderKey(routeProviderId)
  const provider = asObject(providers[currentProviderId])
  const [providerIdInput, setProviderIdInput] = useState(currentProviderId)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [headersOpen, setHeadersOpen] = useState(false)

  useEffect(() => {
    setProviderIdInput(currentProviderId)
  }, [currentProviderId])

  useEffect(() => {
    if (!(currentProviderId in providers)) {
      return
    }

    if (saveVersion > 1 && currentProviderId !== routeProviderId) {
      void navigate({
        to: '/models/provider/$providerId',
        params: { providerId: currentProviderId },
        replace: true,
      })
    }
  }, [currentProviderId, navigate, providers, routeProviderId, saveVersion])

  const providerSummary = useMemo(() => {
    if (!(currentProviderId in providers)) {
      return null
    }

    return summarizeProvider(currentProviderId, provider)
  }, [currentProviderId, provider, providers])

  const providerApiOptions = getProviderApiOptions(metadataMap)
  const providerAuthOptions = getProviderAuthOptions()

  if (!(currentProviderId in providers)) {
    return <ProviderNotFound onBack={() => void navigate({ to: '/models' })} />
  }

  const updateProvider = (
    updater:
      | Record<string, unknown>
      | ((providerValue: Record<string, unknown>) => Record<string, unknown>)
  ) => {
    const nextProvider =
      typeof updater === 'function' ? updater(provider) : updater

    onChange(
      setProviders(rootValue, {
        ...providers,
        [currentProviderId]: nextProvider,
      })
    )
  }

  const commitProviderId = () => {
    const nextProviderId = providerIdInput.trim()

    if (!nextProviderId) {
      toast.error('Provider id is required')
      setProviderIdInput(currentProviderId)
      return
    }

    if (nextProviderId !== currentProviderId && nextProviderId in providers) {
      toast.error('Provider id must be unique')
      setProviderIdInput(currentProviderId)
      return
    }

    if (nextProviderId === currentProviderId) {
      setProviderRouteAlias(routeProviderId, currentProviderId)
      return
    }

    onChange(
      setProviders(
        rootValue,
        renameProviderKey(providers, currentProviderId, nextProviderId)
      )
    )
    setProviderRouteAlias(routeProviderId, nextProviderId)
  }

  const applyHeaders = async (
    rows: Array<{
      key: string
      value: string
    }>
  ) => {
    const nextHeaders = parseKeyValueRows(rows, (value) =>
      parseJsonLikeValue(value)
    )

    const nextProvider = {
      ...provider,
    }

    if (!nextHeaders) {
      delete nextProvider.headers
    } else {
      nextProvider.headers = nextHeaders
    }

    const nextValue = setProviders(rootValue, {
      ...providers,
      [currentProviderId]: nextProvider,
    })

    onChange(nextValue)
    const saved = await onSave(nextValue)
    if (saved) {
      setHeadersOpen(false)
    }
  }

  return (
    <>
      <DetailPageShell
        title={providerSummary?.title ?? currentProviderId}
        description='Edit provider connection and authentication settings.'
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
              'models.providers'
            )}
          >
            <Input
              value={providerIdInput}
              onChange={(event) => setProviderIdInput(event.target.value)}
              onBlur={commitProviderId}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitProviderId()
                }
              }}
            />
          </DetailFormRow>

          <DetailFormRow
            label='Base url'
            description={getMetadataDescription(
              metadataMap,
              'models.providers.*.baseUrl'
            )}
          >
            <Input
              value={readInputValue(provider.baseUrl)}
              onChange={(event) =>
                updateProvider((currentProvider) =>
                  setOptionalStringValue(
                    currentProvider,
                    'baseUrl',
                    event.target.value
                  )
                )
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='API Key'
            description={getMetadataDescription(
              metadataMap,
              'models.providers.*.apiKey'
            )}
            className='sm:grid-cols-1 xl:col-span-2'
          >
            <Input
              value={formatJsonLikeValue(provider.apiKey)}
              onChange={(event) => {
                const nextValue = parseJsonLikeValue(event.target.value)

                updateProvider((currentProvider) => {
                  const nextProvider = {
                    ...currentProvider,
                  }

                  if (nextValue === undefined) {
                    delete nextProvider.apiKey
                    return nextProvider
                  }

                  nextProvider.apiKey = nextValue
                  return nextProvider
                })
              }}
            />
          </DetailFormRow>

          <DetailFormRow
            label={
              stripFieldPrefix(
                metadataMap.get('models.providers.*.api')?.label
              ) ?? 'API Adapter'
            }
            description={getMetadataDescription(
              metadataMap,
              'models.providers.*.api'
            )}
          >
            <SingleSelectField
              options={providerApiOptions}
              value={
                readInputValue(provider.api) ||
                providerApiOptions[0]?.value ||
                'openai-completions'
              }
              onChange={(nextValue) =>
                updateProvider((currentProvider) => ({
                  ...currentProvider,
                  api: nextValue,
                }))
              }
            />
          </DetailFormRow>

          <DetailFormRow
            label='Auth Header'
            description={getMetadataDescription(
              metadataMap,
              'models.providers.*.authHeader'
            )}
          >
            <div className='flex justify-end'>
              <Switch
                checked={readBooleanInputValue(provider.authHeader, false)}
                onCheckedChange={(checked) =>
                  updateProvider((currentProvider) =>
                    setBooleanValue(currentProvider, 'authHeader', checked)
                  )
                }
              />
            </div>
          </DetailFormRow>
        </div>

        <AdvancedSection open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <div className='grid gap-x-8 gap-y-0 xl:grid-cols-2'>
            <DetailFormRow
              label='Headers'
              description={getMetadataDescription(
                metadataMap,
                'models.providers.*.headers'
              )}
            >
              <div className='flex items-center justify-between gap-3'>
                <span className='text-sm text-muted-foreground'>
                  {Object.keys(asObject(provider.headers)).length} configured
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

            <DetailFormRow
              label={
                stripFieldPrefix(
                  metadataMap.get('models.providers.*.auth')?.label
                ) ?? 'Auth Mode'
              }
              description={getMetadataDescription(
                metadataMap,
                'models.providers.*.auth'
              )}
            >
              <SingleSelectField
                options={providerAuthOptions}
                value={
                  readInputValue(provider.auth) ||
                  providerAuthOptions[0]?.value ||
                  'api-key'
                }
                onChange={(nextValue) =>
                  updateProvider((currentProvider) => ({
                    ...currentProvider,
                    auth: nextValue,
                  }))
                }
              />
            </DetailFormRow>

            <DetailFormRow
              label='Inject Num_Ctx'
              description={getMetadataDescription(
                metadataMap,
                'models.providers.*.injectNumCtxForOpenAICompat'
              )}
            >
              <div className='flex justify-end'>
                <Switch
                  checked={readBooleanInputValue(
                    provider.injectNumCtxForOpenAICompat,
                    true
                  )}
                  onCheckedChange={(checked) =>
                    updateProvider((currentProvider) =>
                      setBooleanValue(
                        currentProvider,
                        'injectNumCtxForOpenAICompat',
                        checked
                      )
                    )
                  }
                />
              </div>
            </DetailFormRow>
          </div>
        </AdvancedSection>
      </DetailPageShell>

      <KeyValueEditorDialog
        open={headersOpen}
        onOpenChange={setHeadersOpen}
        title='Provider Headers'
        description='Configure request headers as key/value pairs.'
        rows={readKeyValueRows(provider.headers, (value) =>
          formatJsonLikeValue(value)
        )}
        onApply={(rows) => void applyHeaders(rows)}
        isSaving={isSaving}
      />
    </>
  )
}
