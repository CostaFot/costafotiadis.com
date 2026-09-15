// Plain-Markdown views of the content: /<slug>.md per post and page, /index.md
// and /llms.txt for the whole site. server.js also serves these to terminal
// clients (curl, wget, httpie, xh) that ask for the HTML URL.
import type { CollectionEntry } from 'astro:content';
import { SITE, fmtDate, readingTime, excerptOf } from './site';
import { type Thing, THINGS_INTRO, byDay, longDay, parts, mark, rawImageUrl } from './things';
import { EXPERIMENTS, LAB_INTRO } from './lab';
import type { Appearance, AppearanceGroup } from './elsewhere';
import type { Popular } from './claps';
import { type Verdict, verdictLabel } from './pangram';

type Entry = CollectionEntry<'posts'> | CollectionEntry<'pages'>;

// Relative image paths and site-relative links only make sense inside the
// site; a Markdown file gets read anywhere, so make them absolute.
export function absolutise(body: string): string {
  return body
    .replace(/\]\(\.\.\/\.\.\/images\//g, `](${SITE.url}/images/`)
    .replace(/\]\(\/(?!\/)/g, `](${SITE.url}/`);
}

// `featured` is the post's "featured in" line; `verdict` its Pangram line;
// `elsewhere` is the list under the /elsewhere/ page, which is otherwise a
// one-line body.
export function entryMarkdown(
  entry: Entry,
  { featured = [], elsewhere = [], verdict }: { featured?: Appearance[]; elsewhere?: AppearanceGroup[]; verdict?: Verdict } = {},
): string {
  const url = `${SITE.url}/${entry.data.slug}/`;
  const meta: string[] = [];
  if (entry.collection === 'posts') {
    meta.push(fmtDate(entry.data.date_published), `${readingTime(entry.body)} min read`);
    if (entry.data.tags.length) meta.push(entry.data.tags.map((t) => t.toLowerCase()).join(', '));
  }
  meta.push(url);
  if (featured.length) meta.push(`featured in ${featured.map((a) => `[${a.where}](${a.href})`).join(', ')}`);
  if (verdict) meta.push(`${verdictLabel(verdict).text} · ${verdictLabel(verdict).pct} · [Pangram analysis](${verdict.link})`);
  const groups = elsewhere.map((g) => {
    const lines = g.items.map((a) => {
      const link = a.link.startsWith('/') ? `${SITE.url}${a.link.replace(/\/$/, '')}.md` : a.link;
      return `- ${fmtDate(a.date)} — [${a.title}](${link}) — [${a.where}](${a.href})${a.note ? ` — ${a.note}` : ''}`;
    });
    return `## ${g.name}${g.note ? ` (${g.note})` : ''}\n\n${lines.join('\n')}`;
  });
  const body = absolutise((entry.body || '').trim());
  return [`# ${entry.data.title}`, meta.join('  \n'), '---', ...(body ? [body] : []), ...groups].join('\n\n') + '\n';
}

// One line per post, newest first. Both index.md and llms.txt are built on it.
export function postLines(posts: CollectionEntry<'posts'>[]): string[] {
  return posts.map((p) => {
    const excerpt = excerptOf(p);
    return `- [${p.data.title}](${SITE.url}/${p.data.slug}.md)${excerpt ? `: ${excerpt}` : ''}`;
  });
}

// The things feed as one Markdown page: a heading per day, a line per entry.
// The entry id is on every line so a deploy can be confirmed by grepping for it.
export function thingsMarkdown(things: Thing[]): string {
  const days = byDay(things).map(([, list]) => {
    const lines = list.map(({ data: e }) => {
      const bits = [`${parts(e.date).hm} ${mark(e)}`];
      if (e.type === 'link') bits.push(`[${e.title}](${e.url})`);
      if (e.type === 'photo' && e.image) bits.push(`![${e.text}](${SITE.url}${rawImageUrl(e.image)})`);
      if (e.type === 'video') bits.push(`[video](${SITE.url}/${e.video})`);
      if (e.text && !(e.type === 'photo')) bits.push(e.text.replace(/\s*\n\s*/g, ' '));
      if (e.claude) bits.push(`_claude: ${e.claude.summary}_`);
      if (e.tags.length) bits.push(e.tags.map((t) => `#${t}`).join(' '));
      bits.push(`[#${e.id}](${SITE.url}/things/#${e.id})`);
      return `- ${bits.join(' — ')}`;
    });
    return `## ${longDay(list[0].data.date)}\n\n${lines.join('\n')}`;
  });
  return [
    '# Things',
    `${THINGS_INTRO} Anything marked "claude" was added by the agent, not by Costa.`,
    `${SITE.url}/things/ · [how it works](${SITE.url}/building-things.md)`,
    ...days,
  ].join('\n\n') + '\n';
}

// The lab as one list: the experiments are HTML only (they are canvases), so
// the lines point at the pages themselves.
function labSection(): string {
  const lines = EXPERIMENTS.map((e) => `- [${e.title}](${SITE.url}${e.href}): ${e.description}`);
  return `## Lab\n\n${LAB_INTRO} ${SITE.url}/lab/\n\n${lines.join('\n')}`;
}

// `popular` is the most-beers list from the claps API; empty when the API was
// unreachable at build time, and then the section is left out.
export function siteMarkdown(posts: CollectionEntry<'posts'>[], pages: CollectionEntry<'pages'>[], popular: Popular[] = []): string {
  const beers = popular.map(({ post, beers }, i) => `${i + 1}. [${post.data.title}](${SITE.url}/${post.data.slug}.md) — ${beers === 1 ? '1 beer' : `${beers} beers`}`);
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
    ...(beers.length ? [`## Most beers\n\n${beers.join('\n')}`] : []),
    ...years,
    `## Pages\n\n${pageLines.join('\n')}`,
    `## Things\n\n- [Things](${SITE.url}/things.md): ${THINGS_INTRO}`,
    labSection(),
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
    `## Things\n\n- [Things](${SITE.url}/things.md): ${THINGS_INTRO} One Markdown page for the whole feed.`,
    labSection(),
    `## Optional\n\n- [RSS feed](${SITE.url}/rss.xml)\n- [Source on GitHub](${SITE.repo})`,
  ].join('\n\n') + '\n';
}
