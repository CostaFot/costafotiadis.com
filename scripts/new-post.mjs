#!/usr/bin/env node
// Start a post: write the dated file with its frontmatter and `draft: true`,
// and make this month's image folder so a pasted image is one relative path
// away. The draft renders at /<slug>/ in dev and in the build (with a note,
// noindex, no twin) and is listed nowhere; delete the draft line to publish.
//
//   npm run new -- "At the mountains of madness: Something"
//   npm run new -- "Title" --tags "Android, Kotlin" --slug my-own-slug
//
// The slug is made from the title (the series prefix and its colon included,
// the way the Ghost-era slugs were), unless --slug says otherwise. Nothing is
// committed; that is Costa's call, as always.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const POSTS = 'src/content/posts';
const IMAGES = 'src/images';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const title = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')).join(' ').trim();
if (!title) { console.error('usage: npm run new -- "Title" [--tags "A, B"] [--slug slug]'); process.exit(2); }

const slugify = (s) => s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const slug = opt('--slug') ?? slugify(title);
if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`bad slug "${slug}"`);
const tags = (opt('--tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean);

const now = new Date();
const iso = now.toISOString().replace(/\.\d{3}Z$/, '.000Z'); // the Ghost-era shape
const day = iso.slice(0, 10);
const [year, month] = day.split('-');

for (const f of readdirSync(POSTS)) {
  if (!f.endsWith('.md')) continue;
  const existing = readFileSync(join(POSTS, f), 'utf8').match(/^slug:\s*(\S+)\s*$/m)?.[1];
  if (existing === slug) throw new Error(`${f} already uses the slug "${slug}"; pass --slug for another`);
}

const file = join(POSTS, `${day}-${slug}.md`);
if (existsSync(file)) throw new Error(`${file} already exists`);
const imageDir = join(IMAGES, year, month);
mkdirSync(imageDir, { recursive: true });
const imageRel = `../../${imageDir.replace(/^src\//, '')}`; // as written from src/content/posts/

const q = (s) => `"${s.replace(/"/g, '\\"')}"`;
const md = `---
title: ${q(title)}
slug: ${slug}
date_published: ${iso}
draft: true
tags: [${tags.map(q).join(', ')}]
# excerpt: one line for the card and the meta description; the first paragraph is used otherwise
# feature_image: ${imageRel}/hero.png
# to publish: delete the draft line, set date_published to now, run node --env-file=.env scripts/pangram.mjs
---

`;
writeFileSync(file, md);

console.log(`${file}
images go in ${imageDir}/ and are written as ${imageRel}/<name>
reads at http://localhost:4321/${slug}/ under npm run dev; delete "draft: true" to publish`);
