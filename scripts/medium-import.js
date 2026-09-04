// Turns the Medium story dumps in exports/medium/<medium_id>.json into posts
// under src/content/posts/. The dumps are captured from a logged-in browser
// (Medium answers curl with a Cloudflare challenge): the article body's HTML
// with the title, subtitle and author header removed, gist iframes replaced
// by <script src="https://gist.github.com/…js"> tags, plus the paragraph
// model from window.__APOLLO_STATE__ and the JSON-LD dates. See AGENTS.md.
//
// Usage: node scripts/medium-import.js [--in exports/medium] [--only-new]
//
// Gists are inlined from .gist-cache like scripts/convert.js does. Images are
// left as full-size miro.medium.com URLs; run scripts/localize-remote-images.js
// afterwards to pull them into src/images/YYYY/MM/. Links to other Medium
// stories of Costa's become /<slug>/ through src/data/medium-claps.json.

const fs = require('fs');
const path = require('path');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');
const gist = require('./lib/gist');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const onlyNew = args.includes('--only-new');
const inDir = args.includes('--in') ? args[args.indexOf('--in') + 1] : path.join(ROOT, 'exports', 'medium');
const gistCacheDir = path.join(ROOT, '.gist-cache');

const claps = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'medium-claps.json'), 'utf8'));
const slugById = new Map(claps.posts.filter((p) => p.slug).map((p) => [p.medium_id, p.slug]));
const rowById = new Map(claps.posts.map((p) => [p.medium_id, p]));

const yamlStr = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const tidy = (s) => s.replace(/\s+/g, ' ').trim();

// Medium serves every image through a resize prefix; the bare leaf is the original.
const fullSize = (url) => url.replace(/https:\/\/miro\.medium\.com\/v2\/(?:[a-z]+:[^/]+\/)*([^/"'\s?]+)/g, 'https://miro.medium.com/v2/$1');

const inline = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
inline.use(gfm);

function makeService() {
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', hr: '---', bulletListMarker: '-' });
  td.use(gfm);
  td.remove(['style', 'aside', 'button', 'svg']);
  // Medium's floating "Human" badge on some images.
  td.remove((node) => node.nodeName === 'SPAN' && /position:\s*absolute/.test(node.getAttribute('style') || ''));

  const gistOf = (node) => {
    const src = node.getAttribute('src') || '';
    const m = src.match(/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)\.js/);
    if (m) return gist.gistToMarkdown(m[1], gistCacheDir);
    const title = node.getAttribute('data-title') || 'embed';
    console.warn(`  ! non-gist embed dropped: ${title}`);
    return `<!-- Medium embed dropped: ${title} -->`;
  };

  td.addRule('gist-script', {
    filter: (node) => node.nodeName === 'SCRIPT',
    replacement: (content, node) => `\n\n${gistOf(node)}\n\n`,
  });

  // Medium's "mixtape" link card: <a href><div><h2>title</h2><h3>desc</h3><p>domain</p>…
  td.addRule('mixtape', {
    filter: (node) => node.nodeName === 'A' && !!node.querySelector('h2'),
    replacement: (content, node) => {
      const title = tidy(node.querySelector('h2')?.textContent || node.getAttribute('href'));
      const desc = tidy(node.querySelector('h3')?.textContent || '');
      return `\n\n> **[${title}](${node.getAttribute('href')})**${desc ? `\n> ${desc}` : ''}\n\n`;
    },
  });

  // Medium's tag chips at the top of the body and its "become a member" banner.
  td.addRule('medium-furniture', {
    filter: (node) => node.nodeName === 'A' && /medium\.com\/tag\/|source=promotion/.test(node.getAttribute('href') || ''),
    replacement: () => '',
  });

  td.addRule('figure', {
    filter: (node) => node.nodeName === 'FIGURE',
    replacement: (content, node) => {
      const caption = node.querySelector('figcaption');
      const cap = caption ? inline.turndown(caption.innerHTML).replace(/\n+/g, ' ').trim().replace(/^_(.*)_$/, '$1') : '';
      const script = node.querySelector('script');
      if (script) {
        const md = gistOf(script);
        const title = md.startsWith('<!-- Medium embed') ? '' : cap || script.getAttribute('data-title') || '';
        return `\n\n${md}${title ? `\n\n*${title}*` : ''}\n\n`;
      }
      const img = node.querySelector('img');
      if (img) {
        const alt = (img.getAttribute('alt') || '').replace(/[\[\]]/g, '');
        return `\n\n![${alt}](${fullSize(img.getAttribute('src') || '')})${cap ? `\n\n*${cap}*` : ''}\n\n`;
      }
      return `\n\n${inline.turndown(node.innerHTML)}\n\n`;
    },
  });

  // Medium code blocks: <pre><span>line</span><br><span>line</span></pre>, no <code>.
  td.addRule('pre', {
    filter: (node) => node.nodeName === 'PRE',
    replacement: (content, node) => {
      const html = node.innerHTML.replace(/<br\s*\/?>/g, '\n');
      const tmp = node.ownerDocument.createElement('div');
      tmp.innerHTML = html;
      const code = tmp.textContent.replace(/\s+$/, '').replace(/^\n+/, '');
      return `\n\n\`\`\`${gist.guessLang(code)}\n${code}\n\`\`\`\n\n`;
    },
  });

  return td;
}

// Links to Costa's other stories become /<slug>/; Medium's referrer query goes everywhere.
function relink(md, ownId) {
  return md.replace(/\((https?:\/\/[^)\s]+)\)/g, (m, raw) => {
    const url = raw.replace(/\?source=[^)#]*/, '');
    if (!/medium\.com\//.test(url)) return `(${url})`;
    const id = (url.match(/-([0-9a-f]{12})(?:[?#]|$)/) || url.match(/\/p\/([0-9a-f]{12})/) || [])[1];
    if (id && slugById.has(id)) return `(/${slugById.get(id)}/)`;
    if (id && id !== ownId) console.warn(`  ! link to an unknown Medium story kept: ${url}`);
    return `(${url})`;
  });
}

const dumps = fs.readdirSync(inDir).filter((f) => /^[0-9a-f]{12}\.json$/.test(f)).sort();
let count = 0;
for (const file of dumps) {
  const d = JSON.parse(fs.readFileSync(path.join(inDir, file), 'utf8'));
  const row = rowById.get(d.id);
  if (!row?.slug) { console.warn(`! ${file}: no slug in medium-claps.json, skipped`); continue; }
  const date = d.datePublished;
  if (date.slice(0, 10) !== row.published) console.warn(`  ! ${row.slug}: published ${date.slice(0, 10)} on Medium, ${row.published} in medium-claps.json`);
  const outFile = path.join('src', 'content', 'posts', `${date.slice(0, 10)}-${row.slug}.md`);
  console.log(`${row.slug}`);

  // Medium's three-dot section break is a div of spans; turndown treats it as blank.
  const html = d.html.replace(/<div role="separator">.*?<\/div>/g, '<hr>');
  let body = makeService().turndown(html).trim();
  // Medium renders the body's H3 as <h2> and H4 as <h3> (the <h1> is the title).
  body = body.replace(/^### /gm, '#### ').replace(/^## /gm, '### ');
  const isTitle = (p, i) => i < 2 && (tidy(p.text) === tidy(d.title) || tidy(p.text) === tidy(d.subtitle));
  const wantHeadings = d.paragraphs.filter((p, i) => (p.type === 'H3' || p.type === 'H4') && !isTitle(p, i)).length;
  const gotHeadings = (body.match(/^#{3,4} /gm) || []).length;
  if (wantHeadings !== gotHeadings) console.warn(`  ! ${gotHeadings} headings in the Markdown, ${wantHeadings} in Medium's paragraph model`);
  body = relink(body, d.id);
  body = body.replace(/^---\s*\n+/, '');                     // the separator under the tag chips
  body = body.replace(/\n{3,}/g, '\n\n').trim();

  // A story that opens with an image gets it as the hero instead of a body image.
  let feature;
  const firstBodyIdx = d.paragraphs.findIndex((p, i) => !(i < 2 && (p.type === 'H3' || p.type === 'H4')));
  if (d.paragraphs[firstBodyIdx]?.type === 'IMG') {
    const m = body.match(/^!\[[^\]]*\]\((https:\/\/miro\.medium\.com\/[^)]+)\)(?:\n\n\*[^\n]*\*)?\n*/);
    if (m) { feature = m[1]; body = body.slice(m[0].length); }
  }
  if (/miro\.medium\.com\/v2\/[a-z]+:/.test(body)) console.warn('  ! a resized miro URL survived');

  const fm = [`title: ${yamlStr(d.title.replace(/\s+/g, ' ').trim())}`, `slug: ${row.slug}`, `date_published: ${date}`];
  if (d.dateModified && d.dateModified > date) fm.push(`date_updated: ${d.dateModified}`);
  fm.push('tags: ["Android"]');
  if (d.subtitle) fm.push(`excerpt: ${yamlStr(d.subtitle)}`);
  if (feature) fm.push(`feature_image: ${feature}`);
  fm.push(`original_url: https://medium.com/@con.fotiadis/${row.medium_slug}-${d.id}`);
  fm.push('popular: false');

  const abs = path.join(ROOT, outFile);
  if (onlyNew && fs.existsSync(abs)) { console.log(`- ${outFile} (exists, skipped)`); continue; }
  fs.writeFileSync(abs, `---\n${fm.join('\n')}\n---\n\n${body}\n`);
  console.log(`✓ ${outFile}`);
  count++;
}
console.log(`\n${count} files written from ${dumps.length} dumps`);
