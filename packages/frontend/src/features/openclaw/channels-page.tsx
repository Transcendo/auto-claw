import { fetchChannelsSection, updateChannelsSection } from '@/lib/api'
import { useEnvironmentContext } from '@/context/environment-provider'
import type { OpenClawChannelsSection } from '@/types/openclaw'
import { ConfigSectionPage } from './config-section-page'
import { SchemaFormEditor } from './schema-form-editor'
import { validateAgainstSchema } from './utils'

export function ChannelsPage() {
  const { metadata, isLoadingMetadata } = useEnvironmentContext()
  const sectionMetadata = metadata?.sections.channels

  if (isLoadingMetadata || !sectionMetadata) {
    return null
  }

  return (
    <ConfigSectionPage<OpenClawChannelsSection>
      title='Channels'
      description='Configure built-in channel integrations, account-level settings, and custom extension channels.'
      queryKey='config-channels'
      fetcher={fetchChannelsSection}
      saver={updateChannelsSection}
      schema={sectionMetadata.schema}
      rawPath='inmemory://openclaw/channels.json'
      validate={value =>
        validateAgainstSchema(value, sectionMetadata.schema, 'channels')}
      builder={({ value, onChange }) => (
        <SchemaFormEditor
          path='channels'
          schema={sectionMetadata.schema}
          value={value}
          onChange={nextValue => onChange(nextValue as OpenClawChannelsSection)}
        />
      )}
    />
  )
}
