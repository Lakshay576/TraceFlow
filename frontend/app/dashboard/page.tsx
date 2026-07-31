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
  draft: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  in_review: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  archived: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
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

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
      setIsCreateModalOpen(false);
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
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 text-sm font-bold text-white shadow-sm">
              TF
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">TraceFlow</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
                {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <span className="text-sm text-slate-600">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
            {error}
          </div>
        )}

        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Documents</h2>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:from-indigo-500 hover:to-blue-500"
          >
            <span className="text-base leading-none">+</span>
            New document
          </button>
        </div>

        {isLoadingDocs ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-white ring-1 ring-slate-100" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-14 text-center">
            <p className="text-sm text-slate-500">No documents yet — create one above to get started.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3.5 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => router.push(`/documents/${doc.id}`)}
                    className="truncate text-sm font-medium text-slate-900 transition group-hover:text-indigo-600"
                  >
                    {doc.title}
                  </button>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {doc.type === 'code' ? `Code · ${doc.language}` : 'Text'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[doc.status] ?? ''}`}
                    >
                      {doc.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => setShareTargetId(doc.id)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Share
                  </button>
                  {doc.ownerId === user?.id && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
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
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Share document</h3>
              <button
                onClick={() => setShareTargetId(null)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-slate-500">
              Invite someone to collaborate on this document. They'll get access based on the
              role you choose below.
            </p>

            <form onSubmit={handleShare} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">Email</label>
                <input
                  type="email"
                  autoFocus
                  required
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShareRole('editor')}
                    className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition ${
                      shareRole === 'editor'
                        ? 'border-indigo-500 bg-indigo-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                        shareRole === 'editor' ? 'border-indigo-500' : 'border-slate-300'
                      }`}
                    >
                      {shareRole === 'editor' && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                    </span>
                    Editor
                    <span className="ml-auto">✏️</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareRole('viewer')}
                    className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition ${
                      shareRole === 'viewer'
                        ? 'border-indigo-500 bg-indigo-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                        shareRole === 'viewer' ? 'border-indigo-500' : 'border-slate-300'
                      }`}
                    >
                      {shareRole === 'viewer' && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                    </span>
                    Viewer
                    <span className="ml-auto">👁️</span>
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Editors can make changes to the document. Viewers can only read it.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-100">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShareTargetId(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSharing}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-500 hover:to-blue-500 disabled:opacity-40"
                >
                  {isSharing && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  {isSharing ? 'Sharing…' : 'Share'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Create document</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="mb-5 text-sm leading-relaxed text-slate-500">
              Your document will hold content, collaborators, and version history. Everything
              you need to get started in TraceFlow.
            </p>

            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Name your document..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewType('text')}
                    className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition ${
                      newType === 'text'
                        ? 'border-indigo-500 bg-indigo-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                        newType === 'text' ? 'border-indigo-500' : 'border-slate-300'
                      }`}
                    >
                      {newType === 'text' && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                    </span>
                    Text
                    <span className="ml-auto">📄</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('code')}
                    className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm transition ${
                      newType === 'code'
                        ? 'border-indigo-500 bg-indigo-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                        newType === 'code' ? 'border-indigo-500' : 'border-slate-300'
                      }`}
                    >
                      {newType === 'code' && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                    </span>
                    Code
                    <span className="ml-auto">⌨️</span>
                  </button>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Code documents support syntax highlighting. Pick a language below once selected.
                </p>
              </div>

              {newType === 'code' && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">Language</label>
                  <div className="relative">
                    <select
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                    </select>
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      ▾
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-100">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-500 hover:to-blue-500 disabled:opacity-40"
                >
                  {isCreating ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <span className="text-base leading-none">+</span>
                  )}
                  {isCreating ? 'Creating…' : 'Create document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}