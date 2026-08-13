import jwt from 'jsonwebtoken'
import { sql } from 'kysely'
import { getDb } from '../../config/db.js'
import { getEnv } from '../../config/env.js'
import { verifyPassword } from '../../lib/password.js'
import { AuthUser } from '../../middleware/authenticate.js'
import { AppError } from '../../middleware/errors.js'

const refreshTokenStore = new Map<string, { userId: string; expiresAt: Date }>()

interface UserRow {
  id: number
  email: string
  password_hash: string
  first_name: string
  last_name: string
}

function generateTokens(user: AuthUser) {
  const env = getEnv()
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      warehouseIds: user.warehouseIds,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as `${number}${'s' | 'm' | 'h' | 'd'}` },
  )
  const refreshToken = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as `${number}${'s' | 'm' | 'h' | 'd'}`,
  })
  return { accessToken, refreshToken }
}

export async function login(email: string, password: string) {
  const db = getDb()

  const { rows } = await sql<UserRow>`
    SELECT id, email, password_hash, first_name, last_name
    FROM users
    WHERE email = ${email}
  `.execute(db)

  const user = rows[0]
  if (!user) {
    throw new AppError('Invalid credentials', 401)
  }

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) {
    throw new AppError('Invalid credentials', 401)
  }

  const rolesResult = await sql<{ name: string }>`
    SELECT r.name
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ${user.id}
  `.execute(db)

  const permissionsResult = await sql<{ name: string }>`
    SELECT DISTINCT p.name
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = ${user.id}
  `.execute(db)

  const warehouseResult = await sql<{ warehouse_id: string }>`
    SELECT DISTINCT warehouse_id
    FROM user_roles
    WHERE user_id = ${user.id} AND warehouse_id IS NOT NULL
  `.execute(db)

  const authUser: AuthUser = {
    id: String(user.id),
    email: user.email,
    roles: rolesResult.rows.map((r) => r.name),
    permissions: permissionsResult.rows.map((p) => p.name),
    warehouseIds: warehouseResult.rows.map((w) => String(w.warehouse_id)),
  }

  const tokens = generateTokens(authUser)

  const env = getEnv()
  const refreshExpiresIn = parseDuration(env.JWT_REFRESH_EXPIRES_IN)
  refreshTokenStore.set(tokens.refreshToken, {
    userId: String(user.id),
    expiresAt: new Date(Date.now() + refreshExpiresIn),
  })

  return {
    user: {
      id: authUser.id,
      email: authUser.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: authUser.roles,
    },
    ...tokens,
  }
}

export async function refresh(refreshToken: string) {
  const env = getEnv()

  let payload: { userId: string }
  try {
    payload = jwt.verify(refreshToken, env.JWT_SECRET) as { userId: string }
  } catch {
    throw new AppError('Invalid refresh token', 401)
  }

  const stored = refreshTokenStore.get(refreshToken)
  if (!stored || stored.expiresAt < new Date()) {
    refreshTokenStore.delete(refreshToken)
    throw new AppError('Invalid refresh token', 401)
  }

  refreshTokenStore.delete(refreshToken)

  const db = getDb()
  const { rows } = await sql<{ id: number; email: string }>`
    SELECT id, email
    FROM users
    WHERE id = ${Number(payload.userId)}
  `.execute(db)

  const user = rows[0]
  if (!user) {
    throw new AppError('User not found', 401)
  }

  const rolesResult = await sql<{ name: string }>`
    SELECT r.name
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ${user.id}
  `.execute(db)

  const permissionsResult = await sql<{ name: string }>`
    SELECT DISTINCT p.name
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    JOIN user_roles ur ON ur.role_id = rp.role_id
    WHERE ur.user_id = ${user.id}
  `.execute(db)

  const warehouseResult = await sql<{ warehouse_id: string }>`
    SELECT DISTINCT warehouse_id
    FROM user_roles
    WHERE user_id = ${user.id} AND warehouse_id IS NOT NULL
  `.execute(db)

  const authUser: AuthUser = {
    id: String(user.id),
    email: user.email,
    roles: rolesResult.rows.map((r) => r.name),
    permissions: permissionsResult.rows.map((p) => p.name),
    warehouseIds: warehouseResult.rows.map((w) => String(w.warehouse_id)),
  }

  const tokens = generateTokens(authUser)

  const refreshExpiresIn = parseDuration(env.JWT_REFRESH_EXPIRES_IN)
  refreshTokenStore.set(tokens.refreshToken, {
    userId: String(user.id),
    expiresAt: new Date(Date.now() + refreshExpiresIn),
  })

  return tokens
}

export async function logout(refreshToken: string) {
  refreshTokenStore.delete(refreshToken)
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/)
  if (!match) return 7 * 24 * 60 * 60 * 1000

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 's':
      return value * 1000
    case 'm':
      return value * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    case 'd':
      return value * 24 * 60 * 60 * 1000
    default:
      return 7 * 24 * 60 * 60 * 1000
  }
}
