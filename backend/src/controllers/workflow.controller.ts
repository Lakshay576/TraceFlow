import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as workflowService from '../services/workflow.services.js';
import { getDocumentForUser } from '../services/document.services.js';
import type { DocumentStatus } from '../models/document.js';

export async function transitionDocumentController(req: Request, res: Response) {
  const doc = await workflowService.transitionDocumentStatus(
    req.params.id as string,
    req.userId!,
    req.body.status as DocumentStatus
  );

  res.status(StatusCodes.OK).json({
    document: {
      id: doc._id,
      status: doc.status,
      statusHistory: doc.statusHistory,
    },
  });
}

export async function getAllowedTransitionsController(req: Request, res: Response) {
  const doc = await getDocumentForUser(req.params.id as string, req.userId!);
  const allowed = workflowService.getAllowedTransitions(doc, req.userId!);

  res.status(StatusCodes.OK).json({ currentStatus: doc.status, allowedTransitions: allowed });
}