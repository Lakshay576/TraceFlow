import { apiRequest } from './client ';

export type DocumentType = 'text' | 'code';
export type DocumentStatus = 'draft' | 'in_review' | 'approved' | 'archived';
export type CollaboratorRole = 'viewer' | 'editor';

export interface Collaborator {
  userId: string;
  role: CollaboratorRole;
}

export interface CollabDocument {
  id: string;
  title: string;
  type: DocumentType;
  language: string | null;
  status: DocumentStatus;
  ownerId: string;
  collaborators: Collaborator[];
  createdAt: string;
  updatedAt: string;
}

export function listDocuments(): Promise<{ documents: CollabDocument[] }> {
  return apiRequest('/api/documents');
}

export function getDocument(id: string): Promise<{ document: CollabDocument }> {
  return apiRequest(`/api/documents/${id}`);
}

export function createDocument(
  title: string,
  type: DocumentType,
  language?: string
): Promise<{ document: CollabDocument }> {
  return apiRequest('/api/documents', {
    method: 'POST',
    body: { title, type, language },
  });
}

export function deleteDocument(id: string): Promise<void> {
  return apiRequest(`/api/documents/${id}`, { method: 'DELETE' });
}

export function shareDocument(
  id: string,
  email: string,
  role: CollaboratorRole
): Promise<{ document: CollabDocument }> {
  return apiRequest(`/api/documents/${id}/share`, {
    method: 'POST',
    body: { email, role },
  });
}