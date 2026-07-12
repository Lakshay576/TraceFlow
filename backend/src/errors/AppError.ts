/**
 * Base class for all "expected" errors in the app — errors that come from
 * business logic (bad input, not found, unauthorized) rather than bugs.
 *
 * `isOperational: true` marks this as a known, safe-to-expose-message error.
 * The global error handler uses this flag to decide whether to show the
 * error's message to the client, or hide it behind a generic "Something
 * went wrong" (for genuine bugs/unexpected crashes, where the real message
 * might leak internals like a stack trace or a DB connection string).
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean = true;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}