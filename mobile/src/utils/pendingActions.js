import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

const KEY = 'athr_pending_actions';

// Writes that failed purely because there was no connection at the time —
// queued here so a tap while offline still "sticks" locally and gets
// pushed to the server the next time anything successfully talks to it,
// instead of being silently lost or reverted.
async function readQueue() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    return [];
  }
}

async function writeQueue(queue) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(queue));
  } catch (err) {
    // best-effort only
  }
}

export async function enqueueAction(action) {
  const queue = await readQueue();
  queue.push({ ...action, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` });
  await writeQueue(queue);
}

// Replays queued writes in order, stopping at the first one that still
// fails for network reasons (no point hammering while still offline) —
// whatever's left stays queued for the next call. A queued write that the
// server now rejects outright (not a network error) is dropped rather than
// retried forever.
export async function flushPendingActions() {
  const queue = await readQueue();
  if (!queue.length) return;

  let i = 0;
  for (; i < queue.length; i += 1) {
    const { method, path, body } = queue[i];
    try {
      await api[method](path, body);
    } catch (err) {
      if (err.isNetworkError) break; // still offline — keep this and the rest queued
      // a real rejection (e.g. validation) — drop it and move on
    }
  }
  await writeQueue(queue.slice(i));
}

export async function hasPendingActions() {
  const queue = await readQueue();
  return queue.length > 0;
}
