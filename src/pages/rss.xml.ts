import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE, byNewest, excerptOf } from '../lib/site';

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts')).sort(byNewest);
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site!,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date_published,
      description: excerptOf(p),
      link: `/${p.data.slug}/`,
      categories: p.data.tags,
    })),
    customData: '<language>en</language>',
  });
}
