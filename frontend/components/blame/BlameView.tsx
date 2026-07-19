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
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 px-4">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Who wrote this</h3>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && <p className="text-sm text-gray-400">Loading attribution…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!isLoading && !error && (
            <>
              <pre className="whitespace-pre-wrap rounded-md border border-gray-100 bg-gray-50 p-3 font-mono text-sm leading-relaxed">
                {segments.map((segment, i) => (
                  <span
                    key={i}
                    style={{ backgroundColor: colorForAuthor(segment.author?.id ?? null, colorMap) }}
                    title={segment.author ? segment.author.name : 'Unknown author'}
                  >
                    {segment.text}
                  </span>
                ))}
              </pre>

              <div className="mt-4 flex flex-wrap gap-3">
                {uniqueAuthors.map((author) => (
                  <div key={author.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: colorForAuthor(author.id, colorMap) }}
                    />
                    {author.name}
                  </div>
                ))}
                {segments.some((s) => !s.author) && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: '#e5e7eb' }} />
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