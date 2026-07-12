import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as authService from '../services/auth.services.js';

/**
 * Controllers stay deliberately thin: parse the (already-validated) input,
 * call the service, shape the response. No business logic, no try/catch —
 * any error thrown inside authService just propagates up through
 * asyncHandler to the global error handler.
 */

export async function signupController(req: Request, res: Response) {
  const { token, user } = await authService.signup(req.body);

  res.status(StatusCodes.CREATED).json({
    token,
    user: { id: user._id, email: user.email, name: user.name },
  });
}

export async function loginController(req: Request, res: Response) {
  const { token, user } = await authService.login(req.body);

  res.status(StatusCodes.OK).json({
    token,
    user: { id: user._id, email: user.email, name: user.name },
  });
}