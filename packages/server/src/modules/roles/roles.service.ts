import { sql } from 'kysely'
import { getDb } from '../../config/db.js'

interface CreateRoleInput {
  name: string
  description?: string
}

interface UpdateRoleInput {
  name?: string
  description?: string
}

export async function listRoles() {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    name: string
    description: string | null
    created_at: Date
  }>`
    SELECT id, name, description, created_at
    FROM roles
    ORDER BY id
  `.execute(db)

  return rows.map((r) => ({
    id: String(r.id),
    name: r.name,
    description: r.description,
    createdAt: r.created_at,
  }))
}

export async function listPermissions() {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    name: string
    description: string | null
  }>`
    SELECT id, name, description
    FROM permissions
    ORDER BY id
  `.execute(db)

  return rows.map((r) => ({
    id: String(r.id),
    name: r.name,
    description: r.description,
  }))
}

export async function getRole(id: string) {
  const db = getDb()
  const { rows } = await sql<{
    id: number
    name: string
    description: string | null
    created_at: Date
  }>`
    SELECT id, name, description, created_at
    FROM roles
    WHERE id = ${Number(id)}
  `.execute(db)

  const role = rows[0]
  if (!role) return null

  const permissionsResult = await sql<{ id: number; name: string }>`
    SELECT p.id, p.name
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    WHERE rp.role_id = ${role.id}
  `.execute(db)

  return {
    id: String(role.id),
    name: role.name,
    description: role.description,
    permissions: permissionsResult.rows.map((p) => ({ id: String(p.id), name: p.name })),
    createdAt: role.created_at,
  }
}

export async function createRole(input: CreateRoleInput) {
  const db = getDb()

  const { rows } = await sql<{
    id: number
    name: string
    description: string | null
    created_at: Date
  }>`
    INSERT INTO roles (name, description)
    VALUES (${input.name}, ${input.description ?? null})
    RETURNING id, name, description, created_at
  `.execute(db)

  const role = rows[0]
  return {
    id: String(role.id),
    name: role.name,
    description: role.description,
    createdAt: role.created_at,
  }
}

export async function updateRole(id: string, input: UpdateRoleInput) {
  const db = getDb()

  const fields: string[] = []
  if (input.name !== undefined) {
    fields.push(`name = '${input.name.replace(/'/g, "''")}'`)
  }
  if (input.description !== undefined) {
    fields.push(`description = '${input.description?.replace(/'/g, "''") ?? ''}'`)
  }

  if (fields.length === 0) {
    return getRole(id)
  }

  const { rows } = await sql<{
    id: number
    name: string
    description: string | null
    created_at: Date
  }>`
    UPDATE roles
    SET ${sql.join(
      fields.map((f) => sql.raw(f)),
      sql`, `,
    )}
    WHERE id = ${Number(id)}
    RETURNING id, name, description, created_at
  `.execute(db)

  const role = rows[0]
  if (!role) return null

  return {
    id: String(role.id),
    name: role.name,
    description: role.description,
    createdAt: role.created_at,
  }
}

export async function deleteRole(id: string) {
  const db = getDb()
  const { rows } = await sql<{ id: number }>`
    DELETE FROM roles
    WHERE id = ${Number(id)}
    RETURNING id
  `.execute(db)

  return rows.length > 0
}

export async function assignPermissions(roleId: string, permissionIds: string[]) {
  const db = getDb()

  const roleResult = await sql<{ id: number }>`
    SELECT id FROM roles WHERE id = ${Number(roleId)}
  `.execute(db)

  if (roleResult.rows.length === 0) return null

  await sql`DELETE FROM role_permissions WHERE role_id = ${Number(roleId)}`.execute(db)

  if (permissionIds.length > 0) {
    for (const permId of permissionIds) {
      await sql`INSERT INTO role_permissions (role_id, permission_id) VALUES (${Number(roleId)}, ${Number(permId)})`.execute(
        db,
      )
    }
  }

  return getRole(roleId)
}
