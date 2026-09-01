import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Frontmatter keys are the ones scripts/convert.js emits from the Ghost export.
// `slug` is the Ghost URL path and must stay stable; the glob loader uses it
// as the entry id.
const shared = ({ image }: { image: () => z.ZodTypeAny }) => ({
  title: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  date_published: z.coerce.date(),
  date_updated: z.coerce.date().optional(),
  feature_image: image().optional(),
  original_url: z.string().url().optional(),
});

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
  schema: (ctx) =>
    z.object({
      ...shared(ctx),
      tags: z.array(z.string()).default([]),
      excerpt: z.string().optional(),
    }),
});

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
  schema: (ctx) => z.object(shared(ctx)),
});

export const collections = { posts, pages };
