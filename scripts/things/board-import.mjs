#!/usr/bin/env node
// Puts every things idea that has no `issue` yet on the Linear board, as a
// backlog issue backdated to the entry's date, and writes the issue back into
// the entry. Ran once on 2026-09-06 for the 32 ideas that predate the board;
// safe to run again, it skips entries that already carry an issue.
//   node --env-file=.env scripts/things/board-import.mjs [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { createIssue } from '../../src/lib/linear.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const ENTRIES = path.join(ROOT, 'src', 'content', 'things');
const dry = process.argv.includes('--dry-run');
const apiKey = process.env.LINEAR_API_KEY;
if (!apiKey && !dry) { console.error('LINEAR_API_KEY not set'); process.exit(1); }

// One area label per issue, from the things tags, first match wins.
const LABEL_OF = [['cmdpal', 'cmdpal'], ['linux', 'omarchy'], ['lab', 'lab'], ['blog', 'blog'], ['android', 'android']];
const labelFor = (tags = []) => LABEL_OF.find(([tag]) => tags.includes(tag))?.[1];

const files = fs.readdirSync(ENTRIES).filter((f) => f.endsWith('.json')).sort();
let n = 0;
for (const name of files) {
  const file = path.join(ENTRIES, name);
  const e = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (e.type !== 'idea' || e.issue) continue;
  const line = e.text.split('\n')[0].trim();
  const title = line.length <= 120 ? line : line.slice(0, 120).replace(/\s+\S*$/, '') + '…';
  const label = labelFor(e.tags);
  const description = `${e.text}\n\n---\nFrom [things](https://www.costafotiadis.com/things/#${e.id}), ${e.date.slice(0, 10)}.`;
  console.log(`${e.id}  ${label ? `[${label}]` : '[-]'}  ${title}`);
  n++;
  if (dry) continue;
  e.issue = await createIssue({ apiKey, title, description, labels: label ? [label] : [], createdAt: e.date, signal: AbortSignal.timeout(15000) });
  console.log(`  -> ${e.issue.id} ${e.issue.url}`);
  fs.writeFileSync(file, JSON.stringify(e, null, 2) + '\n');
}
console.log(`${n} idea${n === 1 ? '' : 's'}${dry ? ' would be' : ''} imported`);
