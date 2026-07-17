import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandlers.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  createDocumentSchema,
  documentIdParamSchema,
  shareDocumentSchema,
} from '../validators/document.schema.js';
import {
  createDocumentController,
  listDocumentsController,
  getDocumentController,
  deleteDocumentController,
  shareDocumentController,
  getDocumentBlameController,
} from '../controllers/document.controller.js';
import commentRoutes from './comment.routes.js';
import { transitionDocumentSchema } from '../validators/workflow.schema.js';
import {
  transitionDocumentController,
  getAllowedTransitionsController,
} from '../controllers/workflow.controller.js';

const router = Router();

// Every document route requires a valid JWT — applied once at the
// router level rather than repeated on each individual route.
router.use(requireAuth);

router.post('/', validate(createDocumentSchema), asyncHandler(createDocumentController));
router.get('/', asyncHandler(listDocumentsController));
router.get('/:id', validate(documentIdParamSchema), asyncHandler(getDocumentController));
router.delete('/:id', validate(documentIdParamSchema), asyncHandler(deleteDocumentController));
router.post('/:id/share', validate(shareDocumentSchema), asyncHandler(shareDocumentController));
router.get('/:id/blame', validate(documentIdParamSchema), asyncHandler(getDocumentBlameController));
router.use('/:id/comments', commentRoutes);
router.get(
  '/:id/transitions',
  validate(documentIdParamSchema),
  asyncHandler(getAllowedTransitionsController)
);
router.patch(
  '/:id/status',
  validate(transitionDocumentSchema),
  asyncHandler(transitionDocumentController)
);

export default router;