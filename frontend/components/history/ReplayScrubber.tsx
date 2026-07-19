'use client';

import { useEffect, useState, useCallback } from 'react';
import { listHistoryFrames, replayAtSeq, HistoryFrame } from '../../lib/api/history';
import { ApiError } from '../../lib/api/client ';

interface ReplayScrubberProps {
  documentId: string;
  onClose: () => void;
}

/**
 * This is the feature that only exists because CollabDocs chose a CRDT
 * (Yjs) over Operational Transformation: every edit is a self-contained,
 * order-independent update, so "reconstruct the document as it looked
 * at any past point" requires no special infrastructure beyond storing
 * the update log and replaying it — which is exactly what
 * replay.service.ts's reconstructAtSeq() does on the backend.
 */
export function ReplayScrubber({ documentId, onClose }: ReplayScrubberProps) {
  const [frames, setFrames] = useState<HistoryFrame[]>([]);
  const [seqIndex, setSeqIndex] = useState(0);
  const [text, setText] = useState('');
  const [isLoadingFrames, setIsLoadingFrames] = useState(true);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listHistoryFrames(documentId)
      .then(({ frames }) => {
        setFrames(frames);
        setSeqIndex(frames.length > 0 ? frames.length - 1 : 0);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load history'))
      .finally(() => setIsLoadingFrames(false));
  }, [documentId]);

  const loadTextAtSeq = useCallback(
    async (seq: number) => {
      setIsLoadingText(true);
      try {
        const result = await replayAtSeq(documentId, seq);
        setText(result.text);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to reconstruct this point in history');
      } finally {
        setIsLoadingText(false);
      }
    },
    [documentId]
  );

  useEffect(() => {
    if (frames.length === 0) return;
    loadTextAtSeq(frames[seqIndex].seq);
  }, [seqIndex, frames, loadTextAtSeq]);

  const currentFrame = frames[seqIndex];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 px-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Version history</h3>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoadingFrames && <p className="text-sm text-gray-400">Loading history…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!isLoadingFrames && frames.length === 0 && !error && (
            <p className="text-sm text-gray-400">No edit history recorded for this document yet.</p>
          )}

          {frames.length > 0 && (
            <>
              <input
                type="range"
                min={0}
                max={frames.length - 1}
                value={seqIndex}
                onChange={(e) => setSeqIndex(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>Start</span>
                <span>
                  Edit {seqIndex + 1} of {frames.length}
                  {currentFrame && ` · ${new Date(currentFrame.createdAt).toLocaleString()}`}
                </span>
                <span>Now</span>
              </div>

              <pre
                className={`mt-4 whitespace-pre-wrap rounded-md border border-gray-100 bg-gray-50 p-3 font-mono text-sm leading-relaxed ${
                  isLoadingText ? 'opacity-50' : ''
                }`}
              >
                {text}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}