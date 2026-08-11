import { NextFunction, Request, Response } from 'express'
import { AppError } from './errors.js'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    })
    return
  }

  console.error('Unhandled error:', err)
  res.status(500).json({
    error: 'Internal server error',
    statusCode: 500,
  })
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    error: 'Not found',
    statusCode: 404,
  })
}
