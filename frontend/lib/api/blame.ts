import { apiRequest } from './client ';

export interface BlameAuthor {
  id: string;
  name: string;
  email: string;
}

export interface BlameSegment {
  text: string;
  startIndex: number;
  endIndex: number;
  author: BlameAuthor | null;
}

export function getDocumentBlame(documentId: string): Promise<{ blame: BlameSegment[] }> {
  return apiRequest(`/api/documents/${documentId}/blame`);
}