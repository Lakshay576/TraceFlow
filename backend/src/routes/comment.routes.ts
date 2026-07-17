import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandlers.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { createCommentSchema, documentAndCommentIdSchema } from '../validators/comment.schema.js';
import {
  createCommentController,
  listCommentsController,
  resolveCommentController,
  reopenCommentController,
} from '../controllers/comment.controller.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post('/', validate(createCommentSchema), asyncHandler(createCommentController));
router.get('/', asyncHandler(listCommentsController));
router.patch(
  '/:commentId/resolve',
  validate(documentAndCommentIdSchema),
  asyncHandler(resolveCommentController)
);
router.patch(
  '/:commentId/reopen',
  validate(documentAndCommentIdSchema),
  asyncHandler(reopenCommentController)
);

export default router;