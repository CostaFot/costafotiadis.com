import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import thingsTags from './data/things-tags.json';

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
      // Ghost's per-post meta description; used for <meta name="description"> only.
      description: z.string().optional(),
      // Send this post to the newsletter. scripts/newsletter.mjs mails a post
      // the first time a push turns this on; the site itself ignores it.
      email: z.boolean().default(false),
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

// A row on the /elsewhere/ page: a newsletter issue that linked a post, a talk,
// a podcast. `post` names the post it featured (the build checks the slug
// exists, see src/lib/elsewhere.ts) and the row takes its title; a row with
// no post (a talk) needs a `title` of its own.
const appearance = ({ image }: { image: () => z.ZodTypeAny }) =>
  z
    .object({
      where: z.string(), // "Android Weekly #624", "Google I/O 2026"
      href: z.string().url(),
      date: z.coerce.date(),
      post: z.string().regex(/^[a-z0-9-]+$/).optional(),
      title: z.string().optional(),
      note: z.string().optional(), // backticks and [text](href) links are rendered
      image: image().optional(), // a slide, a screenshot; shown above the row
      alt: z.string().default(''),
    })
    .refine((a) => a.post || a.title, 'an appearance needs a post slug or a title');

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
      // Appearance groups rendered after the body, one rail stamp per group (the /elsewhere/ page).
      elsewhere: z
        .array(z.object({ name: z.string(), note: z.string().optional(), items: z.array(appearance(ctx)) }))
        .optional(),
    }),
});

// The things feed (/things/): one JSON per entry, written by scripts/things/capture.js
// through the /things skill. A port of the validator the old CostaFot/things repo had:
// unknown keys, a wrong type combination, an unknown tag or a missing image all fail
// the build, so a bad entry never renders wrong. `date` stays a string: it is the
// writer's wall clock with its offset, and the page groups by its literal date part.
const THING_ID = /^\d{8}_\d{6}(_\d+)?$/;
const ISO_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;
const isoDate = z.string().regex(ISO_OFFSET, 'ISO date with an explicit offset (no Z)').refine((d) => !Number.isNaN(Date.parse(d)), 'date does not parse');
const things = defineCollection({
  loader: glob({ base: './src/content/things', pattern: '*.json' }),
  schema: ({ image }) =>
    z
      .object({
        schema: z.literal(1),
        id: z.string().regex(THING_ID, 'id must be YYYYMMDD_HHMMSS'),
        date: isoDate,
        type: z.enum(['idea', 'note', 'link', 'photo', 'video']),
        source: z.enum(['claude', 'telegram']),
        text: z.string(),
        text_raw: z.string().optional(),
        url: z.string().url().optional(),
        title: z.string().optional(),
        preview: z.object({ src: image(), origin: z.string() }).optional(),
        image: image().optional(),
        // Videos live on the Railway volume, not in git: media/<id>.<ext>, served at /media/.
        video: z.string().regex(/^media\/\d{8}_\d{6}(_\d+)?\.(mp4|webm|mov)$/).optional(),
        poster: z.string().regex(/^media\/\d{8}_\d{6}(_\d+)?\.jpg$/).optional(),
        tags: z.array(z.string().refine((t) => t in thingsTags, (t) => ({ message: `unknown tag "${t}" (add it to src/data/things-tags.json)` }))).default([]),
        claude: z.object({ summary: z.string().trim().min(1), model: z.string(), at: isoDate }).optional(),
        migrated: z.literal(true).optional(),
        date_precision: z.literal('day').optional(),
      })
      .strict()
      .superRefine((e, ctx) => {
        const fail = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        if ((e.type === 'idea' || e.type === 'note') && !e.text.trim()) fail('text must not be empty');
        if (e.text_raw !== undefined && e.text_raw === e.text) fail('text_raw must differ from text');
        if (e.type === 'link') {
          if (!e.url) fail('link needs url');
          if (!e.title?.trim()) fail('link needs title');
        } else if (e.url !== undefined || e.title !== undefined || e.preview !== undefined) fail('url/title/preview only allowed on link');
        if (e.type === 'photo') {
          if (!e.image) fail('photo needs image');
        } else if (e.image !== undefined) fail('image only allowed on photo');
        if (e.type === 'video') {
          if (!e.video?.startsWith(`media/${e.id}.`)) fail(`video path must be media/${e.id}.<ext>`);
          if (e.poster !== undefined && e.poster !== `media/${e.id}.jpg`) fail(`poster must be media/${e.id}.jpg`);
        } else if (e.video !== undefined || e.poster !== undefined) fail('video/poster only allowed on video');
      }),
});

export const collections = { posts, pages, things };
