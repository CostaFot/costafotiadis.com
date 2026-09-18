import { publishedPosts } from '../lib/posts';
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { siteMarkdown } from '../lib/markdown';
import { popularPosts } from '../lib/claps';

export const GET: APIRoute = async () => {
  const posts = await publishedPosts();
  const pages = await getCollection('pages');
  const popular = await popularPosts(posts);
  return new Response(siteMarkdown(posts, pages, popular), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
