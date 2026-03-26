import type Database from 'better-sqlite3'

type Migration = {
  id: string
  sql: string
}

const migrations: Migration[] = [
  {
    id: '0001_create_environments',
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS environments (
        id TEXT PRIMARY KEY NOT NULL,
        openclaw_path TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
]

function ensureMigrationTable(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `)
}

export function runPendingMigrations(sqlite: Database.Database) {
  ensureMigrationTable(sqlite)

  const appliedIds = new Set<string>(
    sqlite
      .prepare('SELECT id FROM schema_migrations ORDER BY applied_at ASC')
      .all()
      .map((row) => String((row as { id: string }).id))
  )

  const applyMigration = sqlite.transaction((migration: Migration) => {
    sqlite.exec(migration.sql)
    sqlite
      .prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)')
      .run(migration.id, new Date().toISOString())
  })

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      continue
    }
    applyMigration(migration)
  }
}
