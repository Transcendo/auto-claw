import {
  DetailFormRow,
  MultiSelectField,
  SingleSelectField,
} from '@/components/config-builder'
import type {
  OpenClawConfigMetadataEntry,
  OpenClawJsonSchemaNode,
} from '@/types/openclaw'
import { getMetadataDescription, getEnumOptions } from '../lib/agents-fields'
import { asArray, asObject } from '../lib/value-readers'
import { SchemaFormEditor } from '../../schema-form-editor'
import { AgentModelFields } from './agent-model-fields'

type AgentSubagentsFieldsProps = {
  pathPrefix: string
  value: unknown
  metadataMap: Map<string, OpenClawConfigMetadataEntry>
  schema?: OpenClawJsonSchemaNode
  agentOptions: Array<{ label: string; value: string }>
  onChange: (value: Record<string, unknown>) => void
}

function readAllowAgents(value: unknown) {
  return asArray(asObject(value).allowAgents).filter(
    (item): item is string => typeof item === 'string' && item.trim() !== ''
  )
}

export function AgentSubagentsFields({
  pathPrefix,
  value,
  metadataMap,
  schema,
  agentOptions,
  onChange,
}: AgentSubagentsFieldsProps) {
  const subagentsValue = asObject(value)
  const thinkingOptions =
    getEnumOptions(metadataMap, `${pathPrefix}.thinking`).length > 0
      ? getEnumOptions(metadataMap, `${pathPrefix}.thinking`)
      : getEnumOptions(metadataMap, 'agents.list.*.thinkingDefault')
  const allowAgents = readAllowAgents(subagentsValue)

  return (
    <div className='space-y-4 py-4'>
      <div className='grid gap-x-8 gap-y-0 xl:grid-cols-2'>
        <DetailFormRow
          label='Model'
          description={getMetadataDescription(metadataMap, `${pathPrefix}.model`)}
          className='xl:col-span-2'
        >
          <div className='grid gap-x-8 gap-y-0 xl:grid-cols-2'>
            <AgentModelFields
              labelPathPrefix={`${pathPrefix}.model`}
              value={subagentsValue.model}
              metadataMap={metadataMap}
              onChange={(nextValue) =>
                onChange({
                  ...subagentsValue,
                  model: nextValue,
                })
              }
            />
          </div>
        </DetailFormRow>

        <DetailFormRow
          label='Thinking'
          description={getMetadataDescription(
            metadataMap,
            `${pathPrefix}.thinking`
          )}
        >
          <SingleSelectField
            options={thinkingOptions}
            value={
              typeof subagentsValue.thinking === 'string'
                ? subagentsValue.thinking
                : ''
            }
            onChange={(nextValue) =>
              onChange({
                ...subagentsValue,
                thinking: nextValue,
              })
            }
            placeholder='Select thinking level'
          />
        </DetailFormRow>

        <DetailFormRow
          label='Allow Agents'
          description={getMetadataDescription(
            metadataMap,
            `${pathPrefix}.allowAgents`
          )}
        >
          <MultiSelectField
            options={agentOptions}
            value={allowAgents}
            onChange={(nextValue) =>
              onChange({
                ...subagentsValue,
                allowAgents: nextValue,
              })
            }
            placeholder='Select allowed agents'
          />
        </DetailFormRow>
      </div>

      <SchemaFormEditor
        path={pathPrefix}
        schema={schema}
        value={subagentsValue}
        onChange={(nextValue) => onChange(asObject(nextValue))}
        layout='compact'
        descriptionMode='tooltip'
        showAllFields
        allowRemoveOptionalFields={false}
        compactFieldLayout='inline'
        hiddenPaths={[`${pathPrefix}.model`]}
        omitKeys={['thinking', 'allowAgents', 'model']}
      />
    </div>
  )
}
