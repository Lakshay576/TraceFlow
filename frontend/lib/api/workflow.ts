import { apiRequest } from './client ';
import { DocumentStatus } from './documents';

export function getAllowedTransitions(
  documentId: string
): Promise<{ currentStatus: DocumentStatus; allowedTransitions: DocumentStatus[] }> {
  return apiRequest(`/api/documents/${documentId}/transitions`);
}

export function transitionDocument(
  documentId: string,
  status: DocumentStatus
): Promise<{ document: { id: string; status: DocumentStatus; statusHistory: unknown[] } }> {
  return apiRequest(`/api/documents/${documentId}/status`, {
    method: 'PATCH',
    body: { status },
  });
}