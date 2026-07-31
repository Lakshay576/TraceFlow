'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { EditorView } from '@codemirror/view';
import { useRequireAuth } from '../../../lib/hooks/useRequireAuth';
import { getDocument, CollabDocument, DocumentStatus } from '../../../lib/api/documents';
import { ApiError } from '../../../lib/api/client ';
import { CollabEditor } from '../../../components/editor/CollabEditor';
import { WorkflowControls } from '../../../components/workflow/workflowControls';
import { CommentsSidebar } from '../../../components/comments/CommentsSidebar';
import { BlameView } from '../../../components/blame/BlameView';
import { ReplayScrubber } from '../../../components/history/ReplayScrubber';

export default function DocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isChecking } = useRequireAuth();

  const [doc, setDoc] = useState<CollabDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [showBlame, setShowBlame] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (isChecking) return;

    getDocument(params.id)
      .then(({ document }) => setDoc(document))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load document'));
  }, [isChecking, params.id]);

  const handleEditorReady = useCallback((view: EditorView) => {
    setEditorView(view);
  }, []);

  function handleStatusChange(status: DocumentStatus) {
    setDoc((prev) => (prev ? { ...prev, status } : prev));
  }

  if (isChecking || (!doc && !error)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2.5 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          Loading document…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            ✕
          </div>
          <p className="text-sm text-slate-600">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:from-indigo-500 hover:to-blue-500"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800"
          >
            ← Dashboard
          </button>
          <h1 className="truncate text-sm font-semibold text-slate-900">{doc?.title}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBlame(true)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Who wrote this
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              History
            </button>
          </div>
        </div>
      </header>

      {doc && (
        <div className="border-b border-slate-200 bg-white px-6 py-2.5">
          <div className="mx-auto max-w-6xl">
            <WorkflowControls
              documentId={doc.id}
              initialStatus={doc.status}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      )}

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-8 lg:grid-cols-[1fr_280px]">
        {doc && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CollabEditor
              documentId={doc.id}
              docType={doc.type}
              language={doc.language}
              onReady={handleEditorReady}
            />
          </div>
        )}
        {doc && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CommentsSidebar documentId={doc.id} editorView={editorView} />
          </div>
        )}
      </main>

      {doc && showBlame && <BlameView documentId={doc.id} onClose={() => setShowBlame(false)} />}
      {doc && showHistory && (
        <ReplayScrubber documentId={doc.id} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}