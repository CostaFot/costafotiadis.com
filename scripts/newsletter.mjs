#!/usr/bin/env node
// Mail the posts whose `email: true` frontmatter flag is new since the last
// push, through Buttondown's API. Run by .github/workflows/newsletter.yml on
// every push to main that touches src/content/posts/; usable by hand too.
//
//   node scripts/newsletter.mjs --base <sha> --head <sha|worktree> [--dry-run] [--status draft|about_to_send]
//
// A post is sent when its slug has `email: true` at --head and did not at
// --base (keyed on the slug, so renaming the file does not re-send). The email
// is the title, the hero image (`feature_image`, served from /images/), the
// first paragraph (or the `excerpt`), and a link to the post.
// BUTTONDOWN_API_KEY is required unless --dry-run. The status defaults to
// `draft` (NEWSLETTER_STATUS or --status override it); `about_to_send` sends.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://www.costafotiadis.com';
const POSTS = 'src/content/posts';
const API = 'https://api.buttondown.com/v1/emails';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const base = opt('--base', 'HEAD');
const head = opt('--head', 'worktree');
const dryRun = args.includes('--dry-run');
const status = opt('--status', process.env.NEWSLETTER_STATUS || 'draft');
if (!['draft', 'about_to_send'].includes(status)) throw new Error(`bad status ${status}`);

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });

// { path: content } for every post at a ref, or on disk for `worktree`.
function postsAt(ref) {
  const out = {};
  if (ref === 'worktree') {
    for (const f of readdirSync(POSTS)) if (f.endsWith('.md')) out[join(POSTS, f)] = readFileSync(join(POSTS, f), 'utf8');
    return out;
  }
  if (/^0+$/.test(ref)) return out; // GitHub's "before" on a brand-new branch
  git('rev-parse', '--verify', `${ref}^{commit}`);
  for (const p of git('ls-tree', '-r', '--name-only', ref, '--', POSTS).split('\n').filter((l) => l.endsWith('.md')))
    out[p] = git('show', `${ref}:${p}`);
  return out;
}

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

// Same rules as excerptOf() in src/lib/site.ts, minus the 180-char cut: the
// email can hold the whole first paragraph.
function firstParagraph(body) {
  let inFence = false;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) { inFence = !inFence; continue; }
    if (inFence || !line || /^(!|#|<|>|\||-|\*\s|\d+\.)/.test(line)) continue;
    const text = line
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`~]/g, '')
      .trim();
    if (text.length >= 20) return text;
  }
  return '';
}

const flagged = (posts) => {
  const m = new Map();
  for (const [p, md] of Object.entries(posts)) {
    const { fm, body } = frontmatter(md);
    if (fm.email === 'true') m.set(fm.slug, { ...fm, body, path: p });
  }
  return m;
};

const before = flagged(postsAt(base));
const after = flagged(postsAt(head));
const due = [...after.values()].filter((p) => !before.has(p.slug));

if (!due.length) { console.log(`nothing to send (${after.size} flagged at ${head}, ${before.size} at ${base})`); process.exit(0); }

const key = process.env.BUTTONDOWN_API_KEY;
if (!dryRun && !key) throw new Error('BUTTONDOWN_API_KEY is not set');

for (const p of due) {
  const url = `${SITE}/${p.slug}/`;
  const subject = p.title;
  const hero = p.feature_image ? `![](${SITE}${p.feature_image.replace(/^(\.\.\/)+/, '/')})\n\n` : '';
  const body = `${hero}${p.excerpt || firstParagraph(p.body)}\n\n[Read the whole thing](${url})\n`;
  if (dryRun) { console.log(`--- ${status}: ${subject}\n${body}`); continue; }
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, body, status }),
  });
  const text = await res.text();
  if (!res.ok) { console.error(`Buttondown ${res.status} for ${subject}: ${text}`); process.exit(1); }
  console.log(`${status}: ${subject} -> ${url} (${JSON.parse(text).id})`);
}
