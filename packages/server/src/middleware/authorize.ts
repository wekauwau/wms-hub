import { NextFunction, Response } from 'express'
import { AuthenticatedRequest } from './authenticate.js'
import { AppError } from './errors.js'

export function authorize(...requiredPermissions: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 401)
    }

    const hasPermission = requiredPermissions.every((p) => req.user.permissions.includes(p))

    if (!hasPermission) {
      throw new AppError('Forbidden', 403)
    }

    next()
  }
}
