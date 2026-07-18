import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandlers.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import {
  documentIdOnlySchema,
  replayQuerySchema,
  createSnapshotSchema,
} from '../validators/history.schema.js';
import {
  listHistoryFramesController,
  replayAtSeqController,
  createSnapshotController,
  listSnapshotsController,
} from '../controllers/history.controller.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/frames', validate(documentIdOnlySchema), asyncHandler(listHistoryFramesController));
router.get('/replay', validate(replayQuerySchema), asyncHandler(replayAtSeqController));
router.post('/snapshots', validate(createSnapshotSchema), asyncHandler(createSnapshotController));
router.get('/snapshots', validate(documentIdOnlySchema), asyncHandler(listSnapshotsController));

export default router;