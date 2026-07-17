import * as Y from 'yjs';

export function encodeAnchor(ytext: Y.Text, index: number): Buffer {
  const relativePosition = Y.createRelativePositionFromTypeIndex(ytext, index);
  const encoded = Y.encodeRelativePosition(relativePosition);
  return Buffer.from(encoded);
}

export function decodeAnchor(doc: Y.Doc, encoded: Buffer): number | null {
  const relativePosition = Y.decodeRelativePosition(new Uint8Array(encoded));
  const absolutePosition = Y.createAbsolutePositionFromRelativePosition(relativePosition, doc);
  return absolutePosition?.index ?? null;
}