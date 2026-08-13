import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { getEnv } from '../config/env.js'
import { AppError } from './errors.js'

export interface AuthUser {
  id: string
  email: string
  roles: string[]
  permissions: string[]
  warehouseIds: string[]
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Missing or invalid authorization header', 401)
  }

  const token = authHeader.slice(7)

  try {
    const env = getEnv()
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser
    ;(req as AuthenticatedRequest).user = payload
    next()
  } catch {
    throw new AppError('Invalid or expired token', 401)
  }
}
