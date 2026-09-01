import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { rehypeHeadingIds } from '@astrojs/markdown-remark';
import rewriteLinks from './src/lib/remark-rewrite-links.mjs';
import headingAnchors from './src/lib/rehype-heading-anchors.mjs';

// Canonical URLs always point at the real domain, even while the site is
// previewed on a Railway-generated one.
export default defineConfig({
  site: 'https://www.costafotiadis.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [rewriteLinks],
    rehypePlugins: [rehypeHeadingIds, headingAnchors],
    shikiConfig: { theme: 'night-owl', wrap: false },
  },
});
