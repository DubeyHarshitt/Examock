// src/utils/AppError.js
export class AppError extends Error {
  constructor(message, statusCode = 400, details = undefined) {
    super(message)
    this.statusCode = statusCode
    // Optional structured payload (e.g. activation problems, offending
    // questions) rendered by the global error handler as `details`.
    if (details !== undefined) this.details = details
  }
}
