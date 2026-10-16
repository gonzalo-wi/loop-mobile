import * as FileSystem from 'expo-file-system/legacy';
import type { StockControlType } from '../types';
import { draftFileName, parseDraft, type ControlDraft } from '../lib/controlDraft';

// A file instead of SecureStore: a full truck easily exceeds SecureStore's ~2 KB value limit.
function draftPath(userId: string, type: StockControlType): string {
  return `${FileSystem.documentDirectory}${draftFileName(userId, type)}`;
}

export async function saveControlDraft(draft: ControlDraft): Promise<void> {
  await FileSystem.writeAsStringAsync(draftPath(draft.userId, draft.type), JSON.stringify(draft));
}

/** Reads today's draft; a stale or unreadable one is deleted so it never resurfaces. */
export async function loadControlDraft(
  userId: string,
  type: StockControlType,
  now: Date = new Date(),
): Promise<ControlDraft | null> {
  const path = draftPath(userId, type);
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return null;

  const draft = parseDraft(await FileSystem.readAsStringAsync(path), { userId, type }, now);
  if (!draft) await FileSystem.deleteAsync(path, { idempotent: true });
  return draft;
}

export async function clearControlDraft(userId: string, type: StockControlType): Promise<void> {
  await FileSystem.deleteAsync(draftPath(userId, type), { idempotent: true });
}
