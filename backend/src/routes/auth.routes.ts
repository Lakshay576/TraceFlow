import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandlers.js';
import { validate } from '../middleware/validate.js';
import { signupSchema, loginSchema } from '../validators/auth.schema.js';
import { signupController, loginController } from '../controllers/auth.controllers.js';

const router = Router();

router.post('/signup', validate(signupSchema), asyncHandler(signupController));
router.post('/login', validate(loginSchema), asyncHandler(loginController));

export default router;