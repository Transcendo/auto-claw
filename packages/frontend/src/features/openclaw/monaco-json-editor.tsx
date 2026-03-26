import Editor, { useMonaco } from '@monaco-editor/react'
import { useEffect } from 'react'
import '@/lib/monaco'
import type { OpenClawJsonSchemaNode } from '@/types/openclaw'

const schemaRegistry = new Map<string, OpenClawJsonSchemaNode>()

function applySchemaRegistry(
  monaco: NonNullable<ReturnType<typeof useMonaco>>
) {
  const jsonDefaults = (
    monaco.languages.json as unknown as {
      jsonDefaults: {
        setDiagnosticsOptions: (options: {
          allowComments: boolean
          enableSchemaRequest: boolean
          schemas: Array<{
            uri: string
            fileMatch: string[]
            schema: OpenClawJsonSchemaNode
          }>
          validate: boolean
        }) => void
      }
    }
  ).jsonDefaults

  jsonDefaults.setDiagnosticsOptions({
    allowComments: false,
    enableSchemaRequest: false,
    schemas: Array.from(schemaRegistry.entries()).map(([uri, schema]) => ({
      uri: `schema:${uri}`,
      fileMatch: [uri],
      schema,
    })),
    validate: true,
  })
}

type MonacoJsonEditorProps = {
  value: string
  onChange?: (value: string) => void
  path: string
  schema?: OpenClawJsonSchemaNode
  height?: string
  readOnly?: boolean
}

export function MonacoJsonEditor({
  value,
  onChange,
  path,
  schema,
  height = '60vh',
  readOnly = false,
}: MonacoJsonEditorProps) {
  const monaco = useMonaco()

  useEffect(() => {
    if (!monaco || !schema) {
      return
    }

    schemaRegistry.set(path, schema)
    applySchemaRegistry(monaco)

    return () => {
      schemaRegistry.delete(path)
      applySchemaRegistry(monaco)
    }
  }, [monaco, path, schema])

  return (
    <div className='overflow-hidden rounded-xl border bg-background'>
      <Editor
        height={height}
        defaultLanguage='json'
        path={path}
        value={value}
        onChange={nextValue => onChange?.(nextValue ?? '')}
        options={{
          automaticLayout: true,
          formatOnPaste: true,
          formatOnType: true,
          minimap: { enabled: false },
          padding: { top: 16, bottom: 16 },
          readOnly,
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: 'on',
        }}
      />
    </div>
  )
}
