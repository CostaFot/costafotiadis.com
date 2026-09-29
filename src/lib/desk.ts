// The live numbers on the /projects/ desktop: the extensions' installs in the
// Extension stats window and the Graveyard's toll in its journal. Both are
// fetched at build time; the installs are fetched again in the browser (the
// stats CSVs are on raw.githubusercontent.com, which allows it), the
// Graveyard's API has no CORS, so its numbers are as of the last deploy.
// Fails soft like the claps: no network, no numbers, and the window shows
// its screenshot instead.
import apps from '../data/stats-apps.json';

// refs/heads/ keeps raw.githubusercontent.com from guessing where the ref ends (see /stats/).
export const STATS_DATA = 'https://raw.githubusercontent.com/CostaFot/stats/refs/heads/data/data/';
const GRAVEYARD = 'https://graveyard.costafotiadis.com/api/scores?limit=500';

export interface Install { name: string; now: number; week: number }
export interface Toll { slaps: number; kills: number }
/** One terminal line: runs of [text, colour class]. */
export type Line = [string, string][];

const fmt = (n: number) => n.toLocaleString('en-US');
const plural = (n: number, word: string) => `${fmt(n)} ${word}${n === 1 ? '' : 's'}`;

// The profile hero's sums, which are /stats/'s: GitHub downloads plus Store
// acquisitions, the last known value of each column, and the change since
// the last row at least seven days older than the newest.
export function installOf(name: string, csv: string): Install {
  const rows = csv.trim().split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
    const [date, gh, store] = line.split(',');
    return { date, gh: gh ? Number(gh) : null, store: store ? Number(store) : null };
  }).sort((a, b) => a.date.localeCompare(b.date));
  if (!rows.length) throw new Error(`${name}: no rows`);
  const totalAt = (i: number) => {
    const last = (key: 'gh' | 'store') => {
      for (let j = i; j >= 0; j--) if (rows[j][key] != null) return rows[j][key]!;
      return 0;
    };
    return last('gh') + last('store');
  };
  const end = rows.length - 1;
  const cutoff = new Date(Date.parse(rows[end].date) - 7 * 86400000).toISOString().slice(0, 10);
  let ref = 0;
  rows.forEach((r, i) => { if (r.date <= cutoff) ref = i; });
  return { name, now: totalAt(end), week: totalAt(end) - totalAt(ref) };
}

export async function fetchInstalls(init: RequestInit = {}): Promise<Install[]> {
  return Promise.all(apps.map(async (app) => {
    const res = await fetch(`${STATS_DATA}${app.slug}.csv`, init);
    if (!res.ok) throw new Error(`${app.slug}.csv: HTTP ${res.status}`);
    return installOf(app.name, await res.text());
  }));
}

export function statsLines(installs: Install[]): Line[] {
  const width = Math.max(...installs.map((a) => a.name.length), 5) + 2;
  const nums = installs.map((a) => fmt(a.now));
  const numW = Math.max(...nums.map((n) => n.length), fmt(installs.reduce((s, a) => s + a.now, 0)).length);
  const row = (name: string, now: number, week: number, cls: string): Line => [
    [name.padEnd(width), cls],
    [fmt(now).padStart(numW), 't-fg'],
    [`  ${week >= 0 ? '+' : ''}${fmt(week)}`, week > 0 ? 't-green' : 't-dim'],
  ];
  const rows = installs.map((a) => row(a.name, a.now, a.week, 't-fg2'));
  const total = row('total', installs.reduce((s, a) => s + a.now, 0), installs.reduce((s, a) => s + a.week, 0), 't-mute');
  const len = (l: Line) => l.reduce((n, [text]) => n + text.length, 0);
  const rule = Math.max(...[...rows, total].map(len));
  return [...rows, [['─'.repeat(rule), 't-line']], [...total, [' this week', 't-dim']]];
}

// The profile hero's journal lines about the Graveyard.
export function tollLines(t: Toll): Line[] {
  return [
    [['graveyard: ', 't-mute'], [`${plural(t.slaps, 'slap')} and ${plural(t.kills, 'kill')}`, 't-fg2']],
    [['clippy.service: Main process exited, code=killed, status=SIGSLAP', 't-red']],
    [["clippy.service: Failed with result 'signal'.", 't-yellow']],
    [[`clippy.service: Scheduled restart job, restart counter is at ${fmt(t.kills)}.`, 't-dim']],
    [['Started clippy.service - Inappropriate Clippy.', 't-green']],
  ];
}

// Build time only.
let cache: Promise<{ installs?: Install[]; toll?: Toll }> | undefined;
export function deskData() {
  cache ??= (async () => {
    const soft = async <T>(what: string, fn: () => Promise<T>) => {
      try { return await fn(); } catch (e) {
        console.warn(`[desk] no ${what} (${e instanceof Error ? e.message : e}); its window shows the screenshot`);
      }
    };
    const [installs, toll] = await Promise.all([
      soft('install counts', () => fetchInstalls({ signal: AbortSignal.timeout(5000) })),
      soft('graveyard toll', async () => {
        const res = await fetch(GRAVEYARD, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = (await res.json()) as { slaps?: number; kills?: number }[];
        return {
          slaps: rows.reduce((s, r) => s + (r.slaps ?? 0), 0),
          kills: rows.reduce((s, r) => s + (r.kills ?? 0), 0),
        };
      }),
    ]);
    return { installs, toll };
  })();
  return cache;
}
