import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'
import { runPendingMigrations } from './migrations'

const DATABASE_DIR_NAME = '.auto-claw'
const DATABASE_FILE_NAME = 'data.db'

export type CoreDatabase = BetterSQLite3Database<Record<string, never>>
export type SqliteDatabase = Database.Database

let sqlite: SqliteDatabase | null = null
let db: CoreDatabase | null = null

export function getDatabasePath() {
  return resolve(homedir(), DATABASE_DIR_NAME, DATABASE_FILE_NAME)
}

function ensureDatabaseDirectory(databasePath: string) {
  mkdirSync(dirname(databasePath), { recursive: true })
}

function applyDatabasePragmas(database: SqliteDatabase) {
  database.pragma('foreign_keys = ON')
  database.pragma('journal_mode = WAL')
}

export function initializeDatabase() {
  if (sqlite && db) {
    return db
  }

  const databasePath = getDatabasePath()
  ensureDatabaseDirectory(databasePath)

  const connection = new Database(databasePath)
  applyDatabasePragmas(connection)
  runPendingMigrations(connection)

  sqlite = connection
  db = drizzle(connection)

  return db
}

export function getSqlite() {
  initializeDatabase()
  return sqlite as SqliteDatabase
}

export function getDb() {
  return initializeDatabase()
}

export function closeDatabase() {
  if (!sqlite) {
    db = null
    return
  }

  sqlite.close()
  sqlite = null
  db = null
}
