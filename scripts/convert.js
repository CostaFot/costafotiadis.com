// Converts a Ghost export JSON into Markdown files under src/content/.
//
// Usage: node scripts/convert.js [--gist-cache <dir>] [--only-new]
//
// --only-new skips files that already exist, so a fresh Ghost export can add
// posts without overwriting ones edited by hand in this repo.
//
// Gist embeds (<script src="https://gist.github.com/...js">) are inlined as
// fenced code blocks from a local cache of `gh api gists/<id>` responses.
// Without a cache entry the embed falls back to a plain link to the gist.

const fs = require('fs');
const path = require('path');
const TurndownService = require('turndown');
const { gfm } = require('turndown-plugin-gfm');

const ROOT = path.join(__dirname, '..');
const SITE_URL = 'https://www.costafotiadis.com';
// Pages whose body is a JS-driven app; converting to Markdown would destroy
// them, so their HTML is kept verbatim under the frontmatter.
const RAW_HTML_SLUGS = new Set(['things-feed', 'adb-extension-stats']);

const args = process.argv.slice(2);
const onlyNew = args.includes('--only-new');
const gistCacheDir = args.includes('--gist-cache')
  ? args[args.indexOf('--gist-cache') + 1]
  : path.join(ROOT, '.gist-cache');

const exportFile = fs.readdirSync(path.join(ROOT, 'exports'))
  .filter((f) => f.endsWith('.json')).sort().pop();
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'exports', exportFile), 'utf8')).db[0].data;

const tagsById = new Map(data.tags.map((t) => [t.id, t.name]));
const tagsByPost = new Map();
for (const pt of [...data.posts_tags].sort((a, b) => a.sort_order - b.sort_order)) {
  if (!tagsByPost.has(pt.post_id)) tagsByPost.set(pt.post_id, []);
  tagsByPost.get(pt.post_id).push(tagsById.get(pt.tag_id));
}

const published = data.posts.filter((p) => p.status === 'published');

const fileFor = (post) => post.type === 'page'
  ? path.join('src', 'content', 'pages', `${post.slug}.md`)
  : path.join('src', 'content', 'posts', `${post.published_at.slice(0, 10)}-${post.slug}.md`);

const LANG_BY_EXT = {
  kt: 'kotlin', kts: 'kotlin', java: 'java', xml: 'xml', gradle: 'groovy',
  json: 'json', yml: 'yaml', yaml: 'yaml', md: 'markdown', sh: 'bash',
  ps1: 'powershell', toml: 'toml', properties: 'properties', ini: 'ini',
  js: 'javascript', ts: 'typescript', html: 'html', css: 'css', txt: '',
};

function gistToMarkdown(id) {
  const cacheFile = path.join(gistCacheDir, `${id}.json`);
  if (!fs.existsSync(cacheFile)) {
    console.warn(`  ! gist ${id} not in cache, leaving a link`);
    return `[View gist](https://gist.github.com/${id})`;
  }
  const gist = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const blocks = Object.values(gist.files).map((f) => {
    const ext = f.filename.split('.').pop().toLowerCase();
    const lang = LANG_BY_EXT[ext] ?? '';
    const body = f.content.replace(/\s+$/, '');
    return `\`\`\`${lang}\n${body}\n\`\`\``;
  });
  return `<!-- ${gist.html_url} -->\n\n${blocks.join('\n\n')}`;
}

// Secondary converter for caption/snippet fragments, so rules on the main
// service can convert inner HTML without recursing into themselves.
const inline = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
inline.use(gfm);

function makeService() {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    hr: '---',
    bulletListMarker: '-',
  });
  td.use(gfm);
  td.remove('style');

  td.addRule('gist-or-drop-script', {
    filter: (node) => node.nodeName === 'SCRIPT',
    replacement: (content, node) => {
      const m = (node.getAttribute('src') || '').match(/gist\.github\.com\/(?:[^/]+\/)?([a-f0-9]+)\.js/);
      return m ? `\n\n${gistToMarkdown(m[1])}\n\n` : '';
    },
  });

  td.addRule('kg-figure', {
    filter: (node) => node.nodeName === 'FIGURE',
    replacement: (content, node) => {
      const cls = node.getAttribute('class') || '';
      if (cls.includes('kg-bookmark-card')) {
        const a = node.querySelector('a.kg-bookmark-container');
        const title = node.querySelector('.kg-bookmark-title')?.textContent.trim() || a?.getAttribute('href');
        const desc = node.querySelector('.kg-bookmark-description')?.textContent.trim();
        return `\n\n> **[${title}](${a?.getAttribute('href')})**${desc ? `\n> ${desc}` : ''}\n\n`;
      }
      const img = node.querySelector('img');
      const caption = node.querySelector('figcaption');
      if (img) {
        const md = `![${(img.getAttribute('alt') || '').replace(/[\[\]]/g, '')}](${img.getAttribute('src')})`;
        const cap = caption ? inline.turndown(caption.innerHTML).replace(/\n+/g, ' ').trim() : '';
        return `\n\n${md}${cap ? `\n\n*${cap}*` : ''}\n\n`;
      }
      const pre = node.querySelector('pre');
      if (pre) {
        const code = inline.turndown(pre.outerHTML).trim();
        const cap = caption ? inline.turndown(caption.innerHTML).replace(/\n+/g, ' ').trim() : '';
        return `\n\n${code}${cap ? `\n\n*${cap}*` : ''}\n\n`;
      }
      return `\n\n${inline.turndown(node.innerHTML)}\n\n`;
    },
  });

  td.addRule('kg-callout', {
    filter: (node) => node.nodeName === 'DIV' && (node.getAttribute('class') || '').includes('kg-callout-card'),
    replacement: (content, node) => {
      const emoji = node.querySelector('.kg-callout-emoji')?.textContent.trim();
      const text = node.querySelector('.kg-callout-text');
      const body = text ? inline.turndown(text.innerHTML).replace(/\n+/g, ' ').trim() : '';
      return `\n\n> ${emoji ? `${emoji} ` : ''}${body}\n\n`;
    },
  });

  td.addRule('kg-cta', {
    filter: (node) => node.nodeName === 'DIV' && (node.getAttribute('class') || '').includes('kg-cta-card'),
    replacement: (content, node) => {
      const text = node.querySelector('.kg-cta-text');
      const btn = node.querySelector('a.kg-cta-button');
      const lines = [];
      if (text) lines.push(`> ${inline.turndown(text.innerHTML).replace(/\n+/g, ' ').trim()}`);
      if (btn) lines.push(`> **[${btn.textContent.trim()}](${btn.getAttribute('href')})**`);
      return `\n\n${lines.join('\n>\n')}\n\n`;
    },
  });

  td.addRule('kg-file-card', {
    filter: (node) => node.nodeName === 'A' && (node.getAttribute('class') || '').includes('kg-file-card-container'),
    replacement: (content, node) => {
      const title = node.querySelector('.kg-file-card-title')?.textContent.trim();
      const fname = node.querySelector('.kg-file-card-filename')?.textContent.trim();
      return `\n\n📄 [${title || fname}](${node.getAttribute('href')}) (${fname})\n\n`;
    },
  });

  return td;
}

// Rewrites __GHOST_URL__ references: images to paths relative to the Markdown
// file (Astro optimises those at build), files/media to site-absolute paths
// under public/, post/page links to site-absolute /<slug>/.
function rewriteUrls(html, ownFile) {
  const toRel = (target) => path.relative(path.dirname(ownFile), target).replace(/\\/g, '/');
  return html
    .replace(/__GHOST_URL__\/content\/images\/size\/w\d+\//g, '__GHOST_URL__/content/images/')
    .replace(/__GHOST_URL__\/content\/images\//g, `${toRel(path.join('src', 'images'))}/`)
    .replace(/__GHOST_URL__\/content\/(files|media)\//g, (m, kind) => `/${kind}/`)
    .replace(/__GHOST_URL__\/([a-z0-9-]+)\/?(?=["#?])/g, (m, slug) => `/${slug}/`)
    .replace(/__GHOST_URL__\//g, `${SITE_URL}/`);
}

const yamlStr = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

let count = 0;
for (const post of published) {
  const outFile = fileFor(post);
  const tags = tagsByPost.get(post.id) || [];

  const fm = [`title: ${yamlStr(post.title)}`, `slug: ${post.slug}`, `date_published: ${post.published_at}`];
  if (post.updated_at) fm.push(`date_updated: ${post.updated_at}`);
  if (tags.length) fm.push(`tags: [${tags.map(yamlStr).join(', ')}]`);
  if (post.custom_excerpt) fm.push(`excerpt: ${yamlStr(post.custom_excerpt)}`);
  if (post.feature_image) {
    fm.push(`feature_image: ${rewriteUrls(post.feature_image, outFile)}`);
  }
  fm.push(`original_url: ${SITE_URL}/${post.slug}/`);

  const html = rewriteUrls(post.html || '', outFile);
  let body;
  if (RAW_HTML_SLUGS.has(post.slug)) {
    body = `<!-- Kept as raw HTML: this page is a small JS app and has no useful Markdown form. -->\n\n${html.trim()}`;
  } else {
    body = makeService().turndown(html).trim();
  }

  const md = `---\n${fm.join('\n')}\n---\n\n${body}\n`;
  if (md.includes('__GHOST_URL__')) console.warn(`  ! leftover __GHOST_URL__ in ${outFile}`);

  const abs = path.join(ROOT, outFile);
  if (onlyNew && fs.existsSync(abs)) { console.log(`- ${outFile} (exists, skipped)`); continue; }
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, md);
  console.log(`✓ ${outFile}`);
  count++;
}
console.log(`\n${count} files written from ${exportFile}`);
