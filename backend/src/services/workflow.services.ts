import {  getUserRole } from '../models/document.js';
import type { DocumentDoc, DocumentRole, DocumentStatus, } from '../models/document.js';
import { getDocumentForUser } from './document.services.js';
import { ForbiddenError, ValidationError } from '../errors/index.js';
import type { TransitionTable } from '../utils/stateMachine.js';
import { canTransition, allowedTransitionsFrom } from '../utils/stateMachine.js';

const documentTransitionTable: TransitionTable<DocumentStatus, DocumentRole> = {
  draft: {
    editor: ['in_review'],
    owner: ['in_review', 'archived'],
  },
  in_review: {
    editor: ['draft'],
    owner: ['draft', 'approved', 'archived'],
  },
  approved: {
    owner: ['archived'],
  },
  archived: {
    owner: ['draft'],
  },
};

export function getAllowedTransitions(doc: DocumentDoc, userId: string): DocumentStatus[] {
  const role = getUserRole(doc, userId);
  if (!role) return [];
  return allowedTransitionsFrom(documentTransitionTable, doc.status as DocumentStatus, role);
}

export async function transitionDocumentStatus(
  documentId: string,
  userId: string,
  targetStatus: DocumentStatus
): Promise<DocumentDoc> {
  const doc = await getDocumentForUser(documentId, userId);
  const role = getUserRole(doc, userId);

  if (!role) {
    throw new ForbiddenError('You do not have access to this document');
  }

  const currentStatus = doc.status as DocumentStatus;

  if (currentStatus === targetStatus) {
    throw new ValidationError(`Document is already in "${targetStatus}" status`);
  }

  if (!canTransition(documentTransitionTable, currentStatus, targetStatus, role)) {
    throw new ForbiddenError(
      `Cannot transition from "${currentStatus}" to "${targetStatus}" as role "${role}"`
    );
  }

  doc.statusHistory.push({
    from: currentStatus,
    to: targetStatus,
    byUserId: userId as any,
    at: new Date(),
  });
  doc.status = targetStatus;

  await doc.save();
  return doc;
}