// The prose of a post: what goes to Pangram's AI-text detector and what its
// verdict is tied to. Plain ESM so the Astro build (src/lib/pangram.ts) and
// scripts/pangram.mjs hash byte-for-byte the same text.
//
// Fenced code, images, gist comments and bookmark cards go; link text,
// headings, lists and quotes stay as plain lines. Only prose is sent because
// Pangram scopes detection to natural-language prose and lists code and
// technical boilerplate as false-positive prone, and so that a code-only edit
// leaves the verdict fresh.
//
// Changing anything here changes every post's hash, which marks every verdict
// stale and means paying to re-check all of them. Settle it with
// `node scripts/pangram.mjs --dry-run` first.
import { createHash } from 'node:crypto';

// No post uses real HTML today; what looks like a tag outside a fence is a
// Kotlin generic (`ItemCallback<String>`, `<module>:detekt`), so only these
// element names are stripped.
const TAGS = 'video|source|img|a|br|figure|figcaption|kbd|sup|sub|details|summary|div|span|p|em|strong|code|pre|iframe|picture';
const TAG = new RegExp(`</?(?:${TAGS})(?:\\s[^<>]*)?/?>`, 'g');

/** @param {string} body Markdown body of a post, frontmatter already removed */
export function proseOf(body = '') {
  const flat = body
    .replace(/\r\n/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Ghost/Medium bookmark cards: a bold link line, then the description lines.
    .replace(/^> \*\*\[[^\]]*\]\([^)]*\)\*\*[ \t]*\n(?:>.*\n?)*/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(TAG, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  const lines = flat.split('\n').map((raw) => {
    const line = raw.trim();
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) return '';
    return line
      .replace(/^#{1,6}\s+/, '')
      .replace(/^>\s?/, '')
      .replace(/^(?:[-*+]|\d+\.)\s+/, '')
      .replace(/[*`~]+/g, '')
      .replace(/(^|[\s(“"'])_+/g, '$1')
      .replace(/_+(?=[\s).,!?:;”"']|$)/g, '')
      .trim();
  });
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** @param {string} text */
export const proseHash = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

/** @param {string} text */
export const wordCount = (text) => text.split(/\s+/).filter(Boolean).length;
