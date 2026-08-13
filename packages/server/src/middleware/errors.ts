export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class BadRequest extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400)
  }
}

export class Unauthorized extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401)
  }
}

export class Forbidden extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403)
  }
}

export class NotFound extends AppError {
  constructor(message = 'Not found') {
    super(message, 404)
  }
}
