'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '../../lib/hooks/useRequireAuth';
import { clearSession } from '../../lib/auth/session';
import {
  listDocuments,
  createDocument,
  deleteDocument,
  shareDocument,
  CollabDocument,
  DocumentType,
} from '../../lib/api/documents';
import { ApiError } from '../../lib/api/client ';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isChecking } = useRequireAuth();

  const [documents, setDocuments] = useState<CollabDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<DocumentType>('text');
  const [newLanguage, setNewLanguage] = useState('javascript');
  const [isCreating, setIsCreating] = useState(false);

  const [shareTargetId, setShareTargetId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'viewer' | 'editor'>('editor');
  const [isSharing, setIsSharing] = useState(false);

  async function refreshDocuments() {
    setIsLoadingDocs(true);
    try {
      const { documents } = await listDocuments();
      setDocuments(documents);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load documents');
    } finally {
      setIsLoadingDocs(false);
    }
  }

  useEffect(() => {
    if (!isChecking) refreshDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChecking]);

  function handleLogout() {
    clearSession();
    router.push('/login');
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    setError(null);
    try {
      await createDocument(newTitle, newType, newType === 'code' ? newLanguage : undefined);
      setNewTitle('');
      await refreshDocuments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create document');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document? This cannot be undone.')) return;

    try {
      await deleteDocument(id);
      setDocuments((docs) => docs.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete document');
    }
  }

  async function handleShare(e: FormEvent) {
    e.preventDefault();
    if (!shareTargetId || !shareEmail.trim()) return;

    setIsSharing(true);
    setError(null);
    try {
      await shareDocument(shareTargetId, shareEmail, shareRole);
      setShareTargetId(null);
      setShareEmail('');
      await refreshDocuments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to share document');
    } finally {
      setIsSharing(false);
    }
  }

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">CollabDocs</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleCreate} className="mb-8 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-900">New document</h2>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Document title"
              className="flex-1 min-w-[200px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as DocumentType)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="text">Text</option>
              <option value="code">Code</option>
            </select>
            {newType === 'code' && (
              <select
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
              </select>
            )}
            <button
              type="submit"
              disabled={isCreating || !newTitle.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>

        {isLoadingDocs ? (
          <p className="text-sm text-gray-500">Loading documents…</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-gray-500">No documents yet — create one above to get started.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => router.push(`/documents/${doc.id}`)}
                    className="truncate text-sm font-medium text-gray-900 hover:text-blue-600"
                  >
                    {doc.title}
                  </button>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {doc.type === 'code' ? `Code · ${doc.language}` : 'Text'}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLES[doc.status] ?? ''}`}
                    >
                      {doc.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setShareTargetId(doc.id)}
                    className="rounded-md border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    Share
                  </button>
                  {doc.ownerId === user?.id && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {shareTargetId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Share document</h3>
            <form onSubmit={handleShare} className="space-y-3">
              <input
                type="email"
                required
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="collaborator@example.com"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <select
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value as 'viewer' | 'editor')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShareTargetId(null)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSharing}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSharing ? 'Sharing…' : 'Share'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}