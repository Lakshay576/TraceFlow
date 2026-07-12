import type { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as documentService from '../services/document.services.js';

function serializeDocument(doc: any) {
  return {
    id: doc._id,
    title: doc.title,
    type: doc.type,
    language: doc.language,
    status: doc.status,
    ownerId: doc.ownerId,
    collaborators: doc.collaborators,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createDocumentController(req: Request, res: Response) {
  const doc = await documentService.createDocument(req.userId!, req.body);
  res.status(StatusCodes.CREATED).json({ document: serializeDocument(doc) });
}

export async function listDocumentsController(req: Request, res: Response) {
  const docs = await documentService.listDocumentsForUser(req.userId!);
  res.status(StatusCodes.OK).json({ documents: docs.map(serializeDocument) });
}

export async function getDocumentController(req: Request, res: Response) {
  const doc = await documentService.getDocumentForUser(req.params.id as string, req.userId!);
  res.status(StatusCodes.OK).json({ document: serializeDocument(doc) });
}

export async function deleteDocumentController(req: Request, res: Response) {
  await documentService.deleteDocument(req.params.id as string, req.userId!);
  res.status(StatusCodes.NO_CONTENT).send();
}

export async function shareDocumentController(req: Request, res: Response) {
  const doc = await documentService.shareDocument(req.params.id as string, req.userId!, req.body);
  res.status(StatusCodes.OK).json({ document: serializeDocument(doc) });
}