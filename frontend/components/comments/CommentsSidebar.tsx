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

    // Anchors the comment to whatever text is CURRENTLY selected in the
    // editor. If nothing is selected (cursor is just a blinking caret),
    // `from` and `to` are equal — a zero-width anchor at that exact
    // point, which is still valid: it survives edits elsewhere via the
    // same Yjs relative-position mechanism as a real selection would.
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
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-medium text-gray-900">Comments</h3>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Show resolved
        </label>
      </div>

      <form onSubmit={handleCreate} className="border-b border-gray-100 p-3">
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
          className="w-full resize-none rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={isSubmitting || !newCommentText.trim() || !editorView}
          className="mt-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Adding…' : 'Add comment'}
        </button>
      </form>

      {error && <p className="px-4 py-2 text-xs text-red-600">{error}</p>}

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <p className="text-xs text-gray-400">Loading comments…</p>
        ) : visibleComments.length === 0 ? (
          <p className="text-xs text-gray-400">No comments yet.</p>
        ) : (
          <ul className="space-y-3">
            {visibleComments.map((comment) => (
              <li
                key={comment.id}
                className={`rounded-md border p-2.5 text-xs ${
                  comment.resolved ? 'border-gray-100 bg-gray-50 text-gray-400' : 'border-gray-200'
                }`}
              >
                <button
                  onClick={() => jumpToComment(comment)}
                  className="mb-1 block text-left text-gray-700 hover:text-blue-600"
                  disabled={comment.currentPosition.start === null}
                >
                  {comment.text}
                </button>
                {comment.currentPosition.start === null && (
                  <p className="mb-1 text-[10px] italic text-amber-600">
                    Original text was edited — position no longer available
                  </p>
                )}
                <button
                  onClick={() => handleResolve(comment.id, comment.resolved)}
                  className="text-[11px] font-medium text-blue-600 hover:underline"
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