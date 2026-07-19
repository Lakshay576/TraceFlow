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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-blue-600 hover:underline">
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">
          ← Dashboard
        </button>
        <h1 className="text-sm font-medium text-gray-900">{doc?.title}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBlame(true)}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            Who wrote this
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            History
          </button>
        </div>
      </header>

      {doc && (
        <div className="border-b border-gray-100 bg-white px-6 py-2">
          <WorkflowControls
            documentId={doc.id}
            initialStatus={doc.status}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-8 lg:grid-cols-[1fr_280px]">
        {doc && (
          <CollabEditor
            documentId={doc.id}
            docType={doc.type}
            language={doc.language}
            onReady={handleEditorReady}
          />
        )}
        {doc && <CommentsSidebar documentId={doc.id} editorView={editorView} />}
      </main>

      {doc && showBlame && <BlameView documentId={doc.id} onClose={() => setShowBlame(false)} />}
      {doc && showHistory && (
        <ReplayScrubber documentId={doc.id} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}