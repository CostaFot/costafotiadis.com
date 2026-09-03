// The experiments under /lab/. Every src/pages/lab/<slug>/index.astro that
// exports an `experiment` object is one; there is no registry to maintain.
// Used by the lab index and by the Markdown/llms.txt listings.
export type Experiment = { title: string; description: string; date: string };

const modules = import.meta.glob<{ experiment?: Experiment }>('../pages/lab/*/index.astro', { eager: true });

export const EXPERIMENTS: (Experiment & { slug: string; href: string })[] = Object.entries(modules)
  .filter(([, mod]) => mod.experiment)
  .map(([path, mod]) => {
    const slug = path.replace(/^.*\/lab\//, '').replace('/index.astro', '');
    return { slug, href: `/lab/${slug}/`, ...mod.experiment! };
  })
  .sort((a, b) => b.date.localeCompare(a.date));

export const LAB_INTRO = 'Small web experiments. Some of them are strangely addictive.';
