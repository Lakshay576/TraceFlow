import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandlers.js';
import { validate } from '../middleware/validate.js';
import { signupSchema, loginSchema } from '../validators/auth.schema.js';
import { signupController, loginController } from '../controllers/auth.controllers.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/signup', authRateLimiter, validate(signupSchema), asyncHandler(signupController));
router.post('/login', authRateLimiter, validate(loginSchema), asyncHandler(loginController));

export default router;