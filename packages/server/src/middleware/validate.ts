import { NextFunction, Request, Response } from 'express'
import { ZodSchema } from 'zod'
import { AppError } from './errors.js'

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')
      throw new AppError(`Validation failed: ${message}`, 400)
    }
    req.body = result.data
    next()
  }
}
