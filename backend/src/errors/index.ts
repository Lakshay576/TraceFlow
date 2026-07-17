import { StatusCodes } from 'http-status-codes';
import { AppError } from './AppError.js';

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, StatusCodes.NOT_FOUND);
    }
}

export class ValidationError extends AppError {
    constructor(message = 'Invalid input') {
        super(message, StatusCodes.BAD_REQUEST);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, StatusCodes.UNAUTHORIZED);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, StatusCodes.FORBIDDEN);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, StatusCodes.CONFLICT);
    }
}