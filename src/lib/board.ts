// The board snapshot for the build: /board/ (the no-JS page), /board.md,
// /index.md and /llms.txt. Fetched once per build from Linear with
// LINEAR_API_KEY (a Railway variable; `.env` locally). Fails soft like
// src/lib/claps.ts: no key, no network, and the build still passes with the
// page saying the board is offline. The live path is /board.json in server.js.
import { fetchBoard } from './linear.mjs';

// What src/lib/linear.mjs's publicIssue() produces; the only issue fields the site holds.
export interface Issue {
  id: string;
  title: string;
  url: string;
  priority: number; // Linear's: 0 none, 1 urgent, 2 high, 3 medium, 4 low
  state: { name: string; type: string };
  labels: string[];
  project: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
export interface Board { team: string; fetchedAt: string; since: string; issues: Issue[] }

export const BOARD_INTRO = 'What I am working on, what is queued and what got done, straight from Linear.';

let cache: Promise<Board | null> | undefined;
export function board(): Promise<Board | null> {
  cache ??= (async () => {
    const apiKey = process.env.LINEAR_API_KEY || (import.meta.env.LINEAR_API_KEY as string | undefined);
    if (!apiKey) {
      console.warn('[board] LINEAR_API_KEY not set; /board/ renders the offline state');
      return null;
    }
    try {
      return (await fetchBoard({ apiKey, signal: AbortSignal.timeout(8000) })) as Board;
    } catch (e) {
      console.warn(`[board] no issues (${e instanceof Error ? e.message : e}); /board/ renders the offline state`);
      return null;
    }
  })();
  return cache;
}
