// Inlines a GitHub gist as fenced code blocks from a local cache of
// `gh api gists/<id>` responses (.gist-cache/<id>.json, gitignored). Shared by
// scripts/convert.js (Ghost) and scripts/medium-import.js (Medium).

const fs = require('fs');
const path = require('path');

const LANG_BY_EXT = {
  kt: 'kotlin', kts: 'kotlin', java: 'java', xml: 'xml', gradle: 'groovy',
  json: 'json', yml: 'yaml', yaml: 'yaml', md: 'markdown', sh: 'bash',
  ps1: 'powershell', toml: 'toml', properties: 'properties', ini: 'ini',
  js: 'javascript', ts: 'typescript', html: 'html', css: 'css', txt: '',
};

// For code with no usable file extension (Medium <pre> blocks, gists named
// after a function): a rough guess from the content, blank when unsure.
function guessLang(code) {
  if (/\b(fun|val|var|suspend|companion object|data class)\b/.test(code)) return 'kotlin';
  if (/\b(public|private|static)\s+\w+[\s<]|@Override/.test(code)) return 'java';
  if (/\b(implementation|apply plugin|dependencies)\b/.test(code)) return 'groovy';
  if (/^\s*<\?xml|android:|<[A-Z][A-Za-z.]+/.test(code)) return 'xml';
  return '';
}

function gistToMarkdown(id, cacheDir) {
  const cacheFile = path.join(cacheDir, `${id}.json`);
  if (!fs.existsSync(cacheFile)) {
    console.warn(`  ! gist ${id} not in cache, leaving a link`);
    return `[View gist](https://gist.github.com/${id})`;
  }
  const gist = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const blocks = Object.values(gist.files).map((f) => {
    const ext = f.filename.split('.').pop().toLowerCase();
    const lang = LANG_BY_EXT[ext] ?? guessLang(f.content);
    const body = f.content.replace(/\s+$/, '');
    return `\`\`\`${lang}\n${body}\n\`\`\``;
  });
  return `<!-- ${gist.html_url} -->\n\n${blocks.join('\n\n')}`;
}

module.exports = { LANG_BY_EXT, guessLang, gistToMarkdown };
