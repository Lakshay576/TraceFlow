'use client';

import { useEffect, useState } from 'react';
import { getAllowedTransitions, transitionDocument } from '../../lib/api/workflow';
import { DocumentStatus } from '../../lib/api/documents';
import { ApiError } from '../../lib/api/client ';

const STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  archived: 'Archived',
};

interface WorkflowControlsProps {
  documentId: string;
  initialStatus: DocumentStatus;
  onStatusChange?: (status: DocumentStatus) => void;
}

/**
 * Deliberately fetches the allowed-next-states from the backend's
 * transition table rather than hardcoding a duplicate copy of the same
 * rules here. If the backend's workflow.service.ts transition table ever
 * changes, this UI automatically reflects it with zero frontend changes —
 * the single source of truth stays on the server.
 */
export function WorkflowControls({ documentId, initialStatus, onStatusChange }: WorkflowControlsProps) {
  const [status, setStatus] = useState<DocumentStatus>(initialStatus);
  const [allowedTransitions, setAllowedTransitions] = useState<DocumentStatus[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshTransitions() {
    try {
      const result = await getAllowedTransitions(documentId);
      setStatus(result.currentStatus);
      setAllowedTransitions(result.allowedTransitions);
    } catch (err) {
      // Non-fatal: if this fails, the status badge still shows correctly
      // from initialStatus, just without transition buttons available.
      console.error('[workflow] failed to load allowed transitions', err);
    }
  }

  useEffect(() => {
    refreshTransitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  async function handleTransition(targetStatus: DocumentStatus) {
    setIsTransitioning(true);
    setError(null);
    try {
      const { document } = await transitionDocument(documentId, targetStatus);
      setStatus(document.status);
      onStatusChange?.(document.status);
      await refreshTransitions();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change status');
    } finally {
      setIsTransitioning(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}>
        {STATUS_LABELS[status]}
      </span>

      {allowedTransitions.map((target) => (
        <button
          key={target}
          onClick={() => handleTransition(target)}
          disabled={isTransitioning}
          className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {target === 'draft' && status === 'archived' ? 'Reopen' : `Move to ${STATUS_LABELS[target]}`}
        </button>
      ))}

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}