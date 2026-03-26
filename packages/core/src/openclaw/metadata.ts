import configBaselineSnapshot from './config-baseline.snapshot.json'
import { buildSectionSchemaFromEntries } from './schema'
import {
  OPENCLAW_CONFIG_SECTIONS,
  type OpenClawConfigMetadata,
  type OpenClawConfigMetadataEntry,
  type OpenClawConfigSectionKey,
} from './types'

type ConfigBaselineSnapshot = {
  generatedBy?: string
  entries: OpenClawConfigMetadataEntry[]
}

const snapshot = configBaselineSnapshot as ConfigBaselineSnapshot

function getSectionEntries(section: OpenClawConfigSectionKey) {
  return snapshot.entries.filter(
    (entry) => entry.path === section || entry.path.startsWith(`${section}.`)
  )
}

const metadata = {
  generatedBy: snapshot.generatedBy,
  sections: Object.fromEntries(
    OPENCLAW_CONFIG_SECTIONS.map((section) => {
      const entries = getSectionEntries(section)
      const schema = buildSectionSchemaFromEntries(entries, section)

      if (section === 'channels' && schema.additionalProperties === undefined) {
        schema.additionalProperties = true
      }

      return [
        section,
        {
          section,
          rootPath: section,
          entries,
          schema,
        },
      ]
    })
  ) as OpenClawConfigMetadata['sections'],
} satisfies OpenClawConfigMetadata

export function getOpenClawConfigMetadata() {
  return metadata
}
