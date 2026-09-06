#!/usr/bin/env node
// Put posts through Pangram's AI-text detector and keep each verdict in
// src/data/pangram.json, which src/lib/pangram.ts renders as the label under a
// post's meta line, linking to Pangram's public analysis page. Run it before
// committing a new or edited post and commit the JSON with the post:
//
//   node --env-file=.env scripts/pangram.mjs                 # check missing and stale posts
//   node --env-file=.env scripts/pangram.mjs --only <slug>   # re-check one post
//   node --env-file=.env scripts/pangram.mjs --all           # re-check everything
//   node scripts/pangram.mjs --dry-run [--only <slug>]       # what would be sent, no network
//   node scripts/pangram.mjs --check                         # exit 1 on missing/stale/orphan, no network (CI)
//
// Only the prose is sent (src/lib/prose.mjs strips code, images and bookmark
// cards) and its sha256 is stored, so an edit to the prose marks the verdict
// stale while a code-only edit does not. Every result is written as soon as
// it arrives, so a failure mid-run keeps what was paid for. PANGRAM_API_KEY
// is required unless --dry-run or --check.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { proseOf, proseHash, wordCount } from '../src/lib/prose.mjs';

const POSTS = 'src/content/posts';
const DATA = 'src/data/pangram.json';
const API = 'https://text.external-api.pangram.com';
const MODEL = 'pangram-4';
const MIN_WORDS = 50; // Pangram's floor; the shortest post is well above it
const PRICE_PER_100_WORDS = 0.05;
const POLL_MS = 1000;
const TIMEOUT_MS = 300_000;

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const only = opt('--only');
const all = args.includes('--all');
const dryRun = args.includes('--dry-run');
const check = args.includes('--check');

// Same shape as newsletter.mjs; only `slug` is needed here.
function frontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('no frontmatter');
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^".*"$/.test(v)) v = v.slice(1, -1).replace(/\\"/g, '"');
    fm[kv[1]] = v;
  }
  return { fm, body: m[2] };
}

function posts() {
  const out = [];
  for (const f of readdirSync(POSTS).sort()) {
    if (!f.endsWith('.md')) continue;
    const { fm, body } = frontmatter(readFileSync(join(POSTS, f), 'utf8'));
    if (!fm.slug) throw new Error(`${f}: no slug in the frontmatter`);
    const prose = proseOf(body);
    out.push({ slug: fm.slug, file: f, prose, words: wordCount(prose), hash: proseHash(prose) });
  }
  return out;
}

function load() {
  try { return JSON.parse(readFileSync(DATA, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
}

function save(results) {
  const sorted = Object.fromEntries(Object.keys(results).sort().map((k) => [k, results[k]]));
  writeFileSync(DATA, JSON.stringify(sorted, null, 2) + '\n');
}

const list = posts();
const results = load();
const status = (p) => (!results[p.slug] ? 'missing' : results[p.slug].hash !== p.hash ? 'stale' : 'ok');
const orphans = Object.keys(results).filter((slug) => !list.some((p) => p.slug === slug));
const cost = (words) => `$${((words / 100) * PRICE_PER_100_WORDS).toFixed(2)}`;

if (check) {
  const bad = list.filter((p) => status(p) !== 'ok').map((p) => `${p.slug}: ${status(p)}`);
  for (const o of orphans) bad.push(`${o}: orphan (no post has this slug any more)`);
  if (bad.length) {
    console.error(`[pangram] ${bad.length} post(s) without a fresh verdict; run node --env-file=.env scripts/pangram.mjs and commit ${DATA}\n  ${bad.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`[pangram] all ${list.length} posts have a fresh verdict`);
  process.exit(0);
}

const due = only ? list.filter((p) => p.slug === only) : all ? list : list.filter((p) => status(p) !== 'ok');
if (only && !due.length) throw new Error(`no post has the slug ${only}`);
const words = due.reduce((n, p) => n + p.words, 0);

if (dryRun) {
  for (const p of due) console.log(`${status(p).padEnd(7)} ${String(p.words).padStart(5)} words  ${p.hash.slice(0, 12)}  ${p.slug}`);
  if (only) console.log(`\n--- prose of ${only} ---\n${due[0].prose}\n---`);
  console.log(`${due.length} post(s) to check, ${words} words, about ${cost(words)} on ${MODEL}; ${orphans.length} orphan(s) to prune`);
  process.exit(0);
}

if (!due.length && !orphans.length) { console.log(`nothing to check: all ${list.length} posts have a fresh verdict`); process.exit(0); }

const key = process.env.PANGRAM_API_KEY;
if (!key) throw new Error('PANGRAM_API_KEY is not set (run as node --env-file=.env scripts/pangram.mjs)');

const ERRORS = {
  401: 'bad API key',
  402: 'no credit left on the key',
  403: `the ${MODEL} model is not enabled for this key`,
  422: 'Pangram rejected the text or the model selector',
  429: 'rate limited',
  503: 'the model is temporarily unavailable',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, init = {}, retry = true) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { 'x-api-key': key, 'Content-Type': 'application/json' } });
  if (res.status === 429 && retry) { await sleep(2000); return api(path, init, false); }
  const text = await res.text();
  if (!res.ok) throw new Error(`Pangram ${res.status} on ${path}: ${ERRORS[res.status] || text.slice(0, 200)}`);
  return JSON.parse(text);
}

const { models } = await api('/models');
if (!models.includes(MODEL)) throw new Error(`${MODEL} is not available to this key (it has: ${models.join(', ')})`);

if (orphans.length) {
  for (const o of orphans) delete results[o];
  save(results);
  console.log(`pruned ${orphans.length} orphan(s): ${orphans.join(', ')}`);
}

let failed = 0;
let sent = 0;
for (const p of due) {
  if (p.words < MIN_WORDS) { console.error(`${p.slug}: skipped, ${p.words} words is under Pangram's minimum of ${MIN_WORDS}`); failed++; continue; }
  const { task_id } = await api('/task', { method: 'POST', body: JSON.stringify({ text: p.prose, model: MODEL, public_dashboard_link: true }) });
  sent += p.words;
  const deadline = Date.now() + TIMEOUT_MS;
  let r;
  do { await sleep(POLL_MS); r = await api(`/task/${task_id}`); } while (!['STAGE_SUCCESS', 'STAGE_FAILED'].includes(r.stage) && Date.now() < deadline);
  if (r.stage !== 'STAGE_SUCCESS') {
    console.error(`${p.slug}: ${r.stage === 'STAGE_FAILED' ? `failed, ${r.headline || r.prediction || 'no reason given'}` : `timed out after ${TIMEOUT_MS / 1000} s (task ${task_id})`}`);
    failed++;
    continue;
  }
  if (!r.dashboard_link) { console.error(`${p.slug}: the result has no dashboard_link (task ${task_id})`); failed++; continue; }
  const pct = (x) => Math.round(x * 1000) / 1000;
  results[p.slug] = {
    task: task_id,
    link: r.dashboard_link,
    headline: r.headline,
    prediction_short: r.prediction_short,
    fraction_human: pct(r.fraction_human),
    fraction_ai_assisted: pct(r.fraction_ai_assisted),
    fraction_ai: pct(r.fraction_ai),
    model: MODEL,
    version: r.version,
    words: p.words,
    hash: p.hash,
    checked: new Date().toISOString().slice(0, 10),
  };
  save(results);
  console.log(`${p.slug}: ${r.headline} (${Math.round(r.fraction_human * 100)}% human) ${r.dashboard_link}`);
}
console.log(`${due.length - failed}/${due.length} checked, ${sent} words sent (about ${cost(sent)})`);
if (failed) process.exit(1);
