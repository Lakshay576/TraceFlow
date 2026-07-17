import * as Y from 'yjs';

export interface BlameSegment {
  clientId: number;
  text: string;
  startIndex: number;
  endIndex: number;
}

export function getTextBlame(ytext: Y.Text): BlameSegment[] {
  const segments: BlameSegment[] = [];
  let runningIndex = 0;
  let item: any = (ytext as any)._start;

  while (item !== null) {
    if (!item.deleted && item.content?.str !== undefined) {
      const text: string = item.content.str;
      segments.push({
        clientId: item.id.client,
        text,
        startIndex: runningIndex,
        endIndex: runningIndex + text.length,
      });
      runningIndex += text.length;
    }
    item = item.right;
  }

  return segments;
}

export function getBlameAtIndex(ytext: Y.Text, index: number): number | null {
  const segments = getTextBlame(ytext);
  const match = segments.find((s) => index >= s.startIndex && index < s.endIndex);
  return match?.clientId ?? null;
}

export interface ResolvedBlameSegment extends BlameSegment {
  userId: string | null;
}

export function resolveBlameWithUsers(
  segments: BlameSegment[],
  attributions: Map<number, string>
): ResolvedBlameSegment[] {
  return segments.map((segment) => ({
    ...segment,
    userId: attributions.get(segment.clientId) ?? null,
  }));
}