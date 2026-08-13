import { sql } from 'kysely'
import { getDb } from '../../config/db.js'
import { hashPassword } from '../../lib/password.js'

interface CreateUserInput {
  email: string
  password: string
  firstName: string
  lastName: string
}

interface UpdateUserInput {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  status?: string
}

export async function listUsers() {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    email: string
    first_name: string
    last_name: string
    status: string
    created_at: Date
  }>`
    SELECT id, email, first_name, last_name, status, created_at
    FROM users
    ORDER BY id
  `.execute(db)

  return rows.map((r) => ({
    id: String(r.id),
    email: r.email,
    firstName: r.first_name,
    lastName: r.last_name,
    status: r.status,
    createdAt: r.created_at,
  }))
}

export async function getUser(id: string) {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    email: string
    first_name: string
    last_name: string
    status: string
    created_at: Date
    updated_at: Date
  }>`
    SELECT id, email, first_name, last_name, status, created_at, updated_at
    FROM users
    WHERE id = ${Number(id)}
  `.execute(db)

  const user = rows[0]
  if (!user) return null

  const rolesResult = await sql<{ name: string }>`
    SELECT r.name
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ${user.id}
  `.execute(db)

  return {
    id: String(user.id),
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    status: user.status,
    roles: rolesResult.rows.map((r) => r.name),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }
}

export async function createUser(input: CreateUserInput) {
  const db = getDb()
  const passwordHash = await hashPassword(input.password)

  const { rows } = await sql<{ id: number }>`
    INSERT INTO users (email, password_hash, first_name, last_name)
    VALUES (${input.email}, ${passwordHash}, ${input.firstName}, ${input.lastName})
    RETURNING id
  `.execute(db)

  return {
    id: String(rows[0].id),
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
  }
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const db = getDb()

  const fields: string[] = []
  const values: unknown[] = []

  if (input.email !== undefined) {
    fields.push(`email = $${fields.length + 1}`)
    values.push(input.email)
  }
  if (input.firstName !== undefined) {
    fields.push(`first_name = $${fields.length + 1}`)
    values.push(input.firstName)
  }
  if (input.lastName !== undefined) {
    fields.push(`last_name = $${fields.length + 1}`)
    values.push(input.lastName)
  }
  if (input.status !== undefined) {
    fields.push(`status = $${fields.length + 1}`)
    values.push(input.status)
  }
  if (input.password !== undefined) {
    const passwordHash = await hashPassword(input.password)
    fields.push(`password_hash = $${fields.length + 1}`)
    values.push(passwordHash)
  }

  if (fields.length === 0) {
    return getUser(id)
  }

  fields.push(`updated_at = NOW()`)

  const { rows } = await sql<{
    id: number
    email: string
    first_name: string
    last_name: string
    status: string
    created_at: Date
    updated_at: Date
  }>`
    UPDATE users
    SET ${sql.join(
      fields.map((f) => sql.raw(f)),
      sql`, `,
    )}
    WHERE id = ${Number(id)}
    RETURNING id, email, first_name, last_name, status, created_at, updated_at
  `.execute(db)

  const user = rows[0]
  if (!user) return null

  return {
    id: String(user.id),
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }
}

export async function deleteUser(id: string) {
  const db = getDb()
  const { rows } = await sql<{ id: number }>`
    DELETE FROM users
    WHERE id = ${Number(id)}
    RETURNING id
  `.execute(db)

  return rows.length > 0
}
