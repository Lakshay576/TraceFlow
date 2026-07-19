'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { yCollab } from 'y-codemirror.next';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { SocketYjsProvider } from '../../lib/socket/yjsProvider';

interface CollabEditorProps {
  documentId: string;
  docType: 'text' | 'code';
  language?: string | null;
  // Exposes the live CodeMirror EditorView once created, so a parent
  // component (the comments sidebar) can read the CURRENT selection when
  // the user clicks "add comment" — rather than the editor needing to
  // know anything about comments itself. Keeps the editor a reusable,
  // comments-agnostic component.
  onReady?: (view: EditorView) => void;
}

/**
 * One editor component for BOTH document types — the whole point of the
 * "everything on Y.Text" decision. A code document and a plain-text
 * document differ only in which language extension CodeMirror loads for
 * syntax highlighting; the collaboration wiring underneath (yCollab bound
 * to the SAME shared type name, 'content', that the backend's blame and
 * comment-anchor services already expect) is identical either way.
 */
function languageExtension(docType: 'text' | 'code', language?: string | null) {
  if (docType !== 'code') return [];

  switch (language) {
    case 'python':
      return [python()];
    case 'javascript':
    case 'typescript':
    default:
      return [javascript({ typescript: language === 'typescript' })];
  }
}

export function CollabEditor({ documentId, docType, language, onReady }: CollabEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<SocketYjsProvider | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const provider = new SocketYjsProvider(documentId);
    providerRef.current = provider;

    // 'content' matches the field name the backend's blame.service.ts
    // and anchor.service.ts already default to (doc.getText('content'))
    // — this is what makes blame and comment-anchoring actually resolve
    // against the SAME text the editor renders, rather than an unrelated
    // empty Y.Text under a different name.
    const ytext = provider.doc.getText('content');

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        lineNumbers(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        ...languageExtension(docType, language),
        // yCollab wires CodeMirror's own edits into the Y.Text (so typing
        // produces Yjs updates) AND renders remote collaborators' cursors
        // from the shared Awareness instance — this is the actual
        // "multiple people editing the same doc" moment.
        yCollab(ytext, provider.awareness),
        EditorView.theme({
          '&': { height: '70vh', fontSize: '14px' },
          '.cm-scroller': { overflow: 'auto' },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    onReady?.(view);

    provider.onceSynced(() => setIsConnecting(false));

    return () => {
      view.destroy();
      provider.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {isConnecting && (
        <div className="border-b border-gray-100 px-4 py-2 text-xs text-gray-400">
          Connecting…
        </div>
      )}
      {connectionError && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-600">
          {connectionError}
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}