'use client';

import { useEffect, useState, useCallback } from 'react';
import { listHistoryFrames, replayAtSeq, HistoryFrame } from '../../lib/api/history';
import { ApiError } from '../../lib/api/client ';

interface ReplayScrubberProps {
  documentId: string;
  onClose: () => void;
}

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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Version history</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingFrames && (
            <div className="flex items-center gap-2.5 text-sm text-slate-400">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
              Loading history…
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-100">
              {error}
            </div>
          )}

          {!isLoadingFrames && frames.length === 0 && !error && (
            <p className="text-sm text-slate-400">No edit history recorded for this document yet.</p>
          )}

          {frames.length > 0 && (
            <>
              <input
                type="range"
                min={0}
                max={frames.length - 1}
                value={seqIndex}
                onChange={(e) => setSeqIndex(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-indigo-600"
              />
              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>Start</span>
                <span className="font-medium text-slate-500">
                  Edit {seqIndex + 1} of {frames.length}
                  {currentFrame && ` · ${new Date(currentFrame.createdAt).toLocaleString()}`}
                </span>
                <span>Now</span>
              </div>

              <pre
                className={`mt-4 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-relaxed text-slate-800 transition-opacity ${
                  isLoadingText ? 'opacity-40' : ''
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