'use client';

import { useEffect, useState, FormEvent } from 'react';
import { EditorView } from '@codemirror/view';
import {
  listComments,
  createComment,
  resolveComment,
  reopenComment,
  CollabComment,
} from '../../lib/api/comments';
import { ApiError } from '../../lib/api/client ';

interface CommentsSidebarProps {
  documentId: string;
  editorView: EditorView | null;
}

export function CommentsSidebar({ documentId, editorView }: CommentsSidebarProps) {
  const [comments, setComments] = useState<CollabComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  async function refresh() {
    setIsLoading(true);
    try {
      const { comments } = await listComments(documentId);
      setComments(comments);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newCommentText.trim() || !editorView) return;

    const { from, to } = editorView.state.selection.main;

    setIsSubmitting(true);
    setError(null);
    try {
      await createComment(documentId, newCommentText, from, to);
      setNewCommentText('');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResolve(commentId: string, currentlyResolved: boolean) {
    try {
      if (currentlyResolved) {
        await reopenComment(documentId, commentId);
      } else {
        await resolveComment(documentId, commentId);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update comment');
    }
  }

  function jumpToComment(comment: CollabComment) {
    if (!editorView || comment.currentPosition.start === null) return;
    const pos = comment.currentPosition.start;
    editorView.dispatch({
      selection: { anchor: pos, head: comment.currentPosition.end ?? pos },
      scrollIntoView: true,
    });
    editorView.focus();
  }

  const visibleComments = comments.filter((c) => showResolved || !c.resolved);

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-semibold text-slate-900">Comments</h3>
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
          />
          Show resolved
        </label>
      </div>

      <form onSubmit={handleCreate} className="border-b border-slate-100 py-3">
        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder={
            editorView
              ? 'Select text in the editor, then write a comment…'
              : 'Editor still connecting…'
          }
          disabled={!editorView}
          rows={2}
          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="submit"
          disabled={isSubmitting || !newCommentText.trim() || !editorView}
          className="mt-2 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50"
        >
          {isSubmitting && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {isSubmitting ? 'Adding…' : 'Add comment'}
        </button>
      </form>

      {error && (
        <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-600 ring-1 ring-rose-100">
          {error}
        </p>
      )}

      <div className="flex-1 overflow-y-auto py-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
            Loading comments…
          </div>
        ) : visibleComments.length === 0 ? (
          <p className="text-xs text-slate-400">No comments yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {visibleComments.map((comment) => (
              <li
                key={comment.id}
                className={`rounded-lg border p-3 text-xs ${
                  comment.resolved
                    ? 'border-slate-100 bg-slate-50 text-slate-400'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <button
                  onClick={() => jumpToComment(comment)}
                  className={`mb-1.5 block text-left leading-relaxed transition ${
                    comment.resolved ? 'text-slate-400' : 'text-slate-700 hover:text-indigo-600'
                  }`}
                  disabled={comment.currentPosition.start === null}
                >
                  {comment.text}
                </button>
                {comment.currentPosition.start === null && (
                  <p className="mb-1.5 text-[10px] italic text-amber-600">
                    Original text was edited — position no longer available
                  </p>
                )}
                <button
                  onClick={() => handleResolve(comment.id, comment.resolved)}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  {comment.resolved ? 'Reopen' : 'Resolve'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}