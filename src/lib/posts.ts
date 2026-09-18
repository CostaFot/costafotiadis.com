// The posts the site lists: everything that is not a draft, newest first.
// Every page that enumerates posts reads this; only [slug].astro renders a
// draft, and it reads the collection itself for that.
import { getCollection } from 'astro:content';
import { byNewest } from './site';

export const publishedPosts = async () => (await getCollection('posts', (p) => !p.data.draft)).sort(byNewest);
