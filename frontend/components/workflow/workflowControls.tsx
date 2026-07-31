'use client';

import { useEffect, useState } from 'react';
import { getAllowedTransitions, transitionDocument } from '../../lib/api/workflow';
import { DocumentStatus } from '../../lib/api/documents';
import { ApiError } from '../../lib/api/client ';

const STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  in_review: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  archived: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
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
    <div className="flex items-center gap-2.5">
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
        {STATUS_LABELS[status]}
      </span>

      <div className="h-4 w-px bg-slate-200" />

      {allowedTransitions.map((target) => (
        <button
          key={target}
          onClick={() => handleTransition(target)}
          disabled={isTransitioning}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          {isTransitioning && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          )}
          {target === 'draft' && status === 'archived' ? 'Reopen' : `Move to ${STATUS_LABELS[target]}`}
        </button>
      ))}

      {error && (
        <span className="flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
          {error}
        </span>
      )}
    </div>
  );
}