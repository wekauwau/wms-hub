import { Kysely, PostgresDialect, sql } from 'kysely'
import pg from 'pg'

const { Pool } = pg

let _db: Kysely<unknown> | null = null

function getDb(): Kysely<unknown> {
  if (!_db) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })
    _db = new Kysely<unknown>({
      dialect: new PostgresDialect({ pool }),
    })
  }
  return _db
}

export async function checkDatabaseConnection(): Promise<void> {
  await sql`SELECT 1`.execute(getDb())
}
