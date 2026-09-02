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

// A showcase card on the /projects/ page. Cards without an image render as a
// full-width text row; `wide` makes an image card span the grid.
const project = ({ image }: { image: () => z.ZodTypeAny }) =>
  z.object({
    title: z.string(),
    blurb: z.string(), // backticks and [text](href) links are rendered
    image: image().optional(),
    alt: z.string().default(''),
    wide: z.boolean().default(false),
    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  });

const pages = defineCollection({
  loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
  schema: (ctx) =>
    z.object({
      ...shared(ctx),
      // Rendered as a centred 200px circle above the body (the /me/ page).
      portrait: ctx.image().optional(),
      // Project groups rendered after the body, one rail stamp per group (the /projects/ page).
      groups: z
        .array(z.object({ name: z.string(), note: z.string().optional(), projects: z.array(project(ctx)) }))
        .optional(),
    }),
});

export const collections = { posts, pages };
