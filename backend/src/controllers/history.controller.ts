import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as replayService from '../services/replay.service.js';
import * as snapshotService from '../services/snapshot.service.js';

export async function listHistoryFramesController(req: Request, res: Response) {
  const frames = await replayService.listHistoryFrames(req.params.id as string, req.userId!);
  res.status(StatusCodes.OK).json({ frames });
}

export async function replayAtSeqController(req: Request, res: Response) {
  const targetSeq = parseInt(req.query.seq as string, 10);
  const field = typeof req.query.field === 'string' ? req.query.field : 'content';

  const result = await replayService.replayTextAtSeq(req.params.id as string, req.userId!, targetSeq, field);
  res.status(StatusCodes.OK).json(result);
}

export async function createSnapshotController(req: Request, res: Response) {
  const snapshot = await snapshotService.createSnapshot(req.params.id as string, req.userId!, req.body.label);
  res.status(StatusCodes.CREATED).json({
    snapshot: {
      id: snapshot._id,
      documentId: snapshot.documentId,
      atSeq: snapshot.atSeq,
      label: snapshot.label,
      createdAt: snapshot.createdAt,
    },
  });
}

export async function listSnapshotsController(req: Request, res: Response) {
  const snapshots = await snapshotService.listSnapshots(req.params.id as string, req.userId!);
  res.status(StatusCodes.OK).json({ snapshots });
}