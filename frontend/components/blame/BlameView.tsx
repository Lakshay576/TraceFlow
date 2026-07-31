'use client';

import { useEffect, useState } from 'react';
import { getDocumentBlame, BlameSegment } from '../../lib/api/blame';
import { ApiError } from '../../lib/api/client ';

interface BlameViewProps {
  documentId: string;
  onClose: () => void;
}

const PALETTE = [
  '#fde68a', '#bfdbfe', '#bbf7d0', '#fecaca', '#e9d5ff', '#fed7aa',
];

function colorForAuthor(authorId: string | null, colorMap: Map<string, string>): string {
  if (!authorId) return '#e5e7eb';
  if (!colorMap.has(authorId)) {
    colorMap.set(authorId, PALETTE[colorMap.size % PALETTE.length]);
  }
  return colorMap.get(authorId)!;
}

export function BlameView({ documentId, onClose }: BlameViewProps) {
  const [segments, setSegments] = useState<BlameSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocumentBlame(documentId)
      .then(({ blame }) => setSegments(blame))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load blame data'))
      .finally(() => setIsLoading(false));
  }, [documentId]);

  const colorMap = new Map<string, string>();
  const uniqueAuthors = Array.from(
    new Map(
      segments
        .filter((s) => s.author)
        .map((s) => [s.author!.id, s.author!])
    ).values()
  );

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Who wrote this</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex items-center gap-2.5 text-sm text-slate-400">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
              Loading attribution…
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-100">
              {error}
            </div>
          )}

          {!isLoading && !error && (
            <>
              <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-relaxed text-slate-800">
                {segments.map((segment, i) => (
                  <span
                    key={i}
                    style={{ backgroundColor: colorForAuthor(segment.author?.id ?? null, colorMap) }}
                    title={segment.author ? segment.author.name : 'Unknown author'}
                    className="text-slate-900"
                  >
                    {segment.text}
                  </span>
                ))}
              </pre>

              <div className="mt-4 flex flex-wrap gap-3">
                {uniqueAuthors.map((author) => (
                  <div
                    key={author.id}
                    className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: colorForAuthor(author.id, colorMap) }}
                    />
                    {author.name}
                  </div>
                ))}
                {segments.some((s) => !s.author) && (
                  <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-400">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#e5e7eb' }} />
                    Unknown author
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}