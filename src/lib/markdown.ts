// Plain-Markdown views of the content: /<slug>.md per post and page, /index.md
// and /llms.txt for the whole site. server.js also serves these to terminal
// clients (curl, wget, httpie, xh) that ask for the HTML URL.
import type { CollectionEntry } from 'astro:content';
import { SITE, fmtDate, readingTime, excerptOf } from './site';

type Entry = CollectionEntry<'posts'> | CollectionEntry<'pages'>;

// Relative image paths and site-relative links only make sense inside the
// site; a Markdown file gets read anywhere, so make them absolute.
export function absolutise(body: string): string {
  return body
    .replace(/\]\(\.\.\/\.\.\/images\//g, `](${SITE.url}/images/`)
    .replace(/\]\(\/(?!\/)/g, `](${SITE.url}/`);
}

export function entryMarkdown(entry: Entry): string {
  const url = `${SITE.url}/${entry.data.slug}/`;
  const meta: string[] = [];
  if (entry.collection === 'posts') {
    meta.push(fmtDate(entry.data.date_published), `${readingTime(entry.body)} min read`);
    if (entry.data.tags.length) meta.push(entry.data.tags.map((t) => t.toLowerCase()).join(', '));
  }
  meta.push(url);
  return `# ${entry.data.title}\n\n${meta.join('  \n')}\n\n---\n\n${absolutise((entry.body || '').trim())}\n`;
}

// One line per post, newest first. Both index.md and llms.txt are built on it.
export function postLines(posts: CollectionEntry<'posts'>[]): string[] {
  return posts.map((p) => {
    const excerpt = excerptOf(p);
    return `- [${p.data.title}](${SITE.url}/${p.data.slug}.md)${excerpt ? `: ${excerpt}` : ''}`;
  });
}

export function siteMarkdown(posts: CollectionEntry<'posts'>[], pages: CollectionEntry<'pages'>[]): string {
  const byYear = new Map<number, CollectionEntry<'posts'>[]>();
  for (const p of posts) {
    const y = p.data.date_published.getUTCFullYear();
    byYear.set(y, [...(byYear.get(y) || []), p]);
  }
  const years = [...byYear.entries()].map(([y, ps]) => `## ${y}\n\n${postLines(ps).join('\n')}`);
  const pageLines = pages.map((p) => `- [${p.data.title}](${SITE.url}/${p.data.slug}.md)`);
  return [
    `# ${SITE.title}`,
    SITE.description,
    `${SITE.url}/ · every post is also at /<slug>.md · [RSS](${SITE.url}/rss.xml)`,
    ...years,
    `## Pages\n\n${pageLines.join('\n')}`,
  ].join('\n\n') + '\n';
}

// https://llmstxt.org/ — a title, a blockquote summary, then link lists.
export function llmsTxt(posts: CollectionEntry<'posts'>[], pages: CollectionEntry<'pages'>[]): string {
  const pageLines = pages.map((p) => `- [${p.data.title}](${SITE.url}/${p.data.slug}.md)`);
  return [
    `# ${SITE.title}`,
    `> ${SITE.description} Personal site of Costa Fotiadis, an Android engineer.`,
    `Every post and page is available as Markdown at its own URL with a \`.md\` extension, for example ${SITE.url}/${posts[0].data.slug}.md. The HTML version is the same URL with a trailing slash.`,
    `## Posts\n\n${postLines(posts).join('\n')}`,
    `## Pages\n\n${pageLines.join('\n')}`,
    `## Optional\n\n- [RSS feed](${SITE.url}/rss.xml)\n- [Source on GitHub](${SITE.repo})`,
  ].join('\n\n') + '\n';
}
