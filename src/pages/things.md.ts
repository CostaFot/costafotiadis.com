import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { byNewestThing } from '../lib/things';
import { thingsMarkdown } from '../lib/markdown';

export const GET: APIRoute = async () => {
  const things = (await getCollection('things')).sort(byNewestThing);
  return new Response(thingsMarkdown(things), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
