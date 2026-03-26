import { fetchModelsSection, updateModelsSection } from '@/lib/api'
import { useEnvironmentContext } from '@/context/environment-provider'
import type { OpenClawModelsSection } from '@/types/openclaw'
import { ConfigSectionPage } from './config-section-page'
import { SchemaFormEditor } from './schema-form-editor'
import { validateAgainstSchema } from './utils'

export function ModelsPage() {
  const { metadata, isLoadingMetadata } = useEnvironmentContext()
  const sectionMetadata = metadata?.sections.models

  if (isLoadingMetadata || !sectionMetadata) {
    return null
  }

  return (
    <ConfigSectionPage<OpenClawModelsSection>
      title='Models'
      description='Manage providers, model definitions, and related model capabilities for the selected environment.'
      queryKey='config-models'
      fetcher={fetchModelsSection}
      saver={updateModelsSection}
      schema={sectionMetadata.schema}
      rawPath='inmemory://openclaw/models.json'
      validate={value =>
        validateAgainstSchema(value, sectionMetadata.schema, 'models')}
      builder={({ value, onChange }) => (
        <SchemaFormEditor
          path='models'
          schema={sectionMetadata.schema}
          value={value}
          onChange={nextValue => onChange(nextValue as OpenClawModelsSection)}
        />
      )}
    />
  )
}
