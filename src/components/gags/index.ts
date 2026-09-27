// The meme gags, each keyed on the image it is drawn over, by its path under
// src/images/ so a same-named image from another month does not get it.
// [slug].astro gives a post the gags whose images its body uses, and counts
// them in its meta line. The shared code is src/lib/gags.ts; the shared
// styles are gags.css. A new gag is a component here and a line below.
import Clippy from './Clippy.astro';
import Nuke from './Nuke.astro';
import Pepe from './Pepe.astro';
import Scooby from './Scooby.astro';
import Spaghetti from './Spaghetti.astro';
import Squidward from './Squidward.astro';
import './gags.css';

export const GAGS = [
  { image: '2026/09/spaghetti.gif', component: Spaghetti },
  { image: '2026/09/clippy-help.png', component: Clippy },
  { image: '2026/09/sf-sisyphus.png', component: Nuke },
  { image: '2026/09/scooby-doo-unmask.png', component: Scooby },
  { image: '2026/09/squidward-vibecoders.png', component: Squidward },
  { image: '2026/09/pepe-shareholder-value.png', component: Pepe },
];

export const gagsIn = (body = '') => GAGS.filter((g) => body.includes(`images/${g.image}`));
