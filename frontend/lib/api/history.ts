import { apiRequest } from './client ';

export interface HistoryFrame {
  seq: number;
  userId: string;
  createdAt: string;
}

export function listHistoryFrames(documentId: string): Promise<{ frames: HistoryFrame[] }> {
  return apiRequest(`/api/documents/${documentId}/history/frames`);
}

export function replayAtSeq(documentId: string, seq: number): Promise<{ seq: number; text: string }> {
  return apiRequest(`/api/documents/${documentId}/history/replay?seq=${seq}`);
}

export function createSnapshot(
  documentId: string,
  label?: string
): Promise<{ snapshot: { id: string; atSeq: number; label: string | null; createdAt: string } }> {
  return apiRequest(`/api/documents/${documentId}/history/snapshots`, {
    method: 'POST',
    body: { label },
  });
}