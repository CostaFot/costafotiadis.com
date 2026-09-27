// The meme gags, each keyed on the image it is drawn over, by its path under
// src/images/ so a same-named image from another month does not get it.
// [slug].astro gives a post the gags whose images its body or its hero uses,
// and counts them in its meta line. The shared code is src/lib/gags.ts; the
// shared styles are gags.css. A new gag is a component here and a line below.
// A gag on a meme template that turns up in several posts is one component
// with a line per image: it gets `image` as a prop, renders
// `<template class="gag-props" data-gag="<name>" data-stem={stemOf(image)}>`,
// and its script sets up every stem `stemsOf('<name>')` returns, with each
// image's coordinates in a table keyed by stem at the top of the script.
import Clippy from './Clippy.astro';
import Gnome from './Gnome.astro';
import Nuke from './Nuke.astro';
import Pepe from './Pepe.astro';
import Scooby from './Scooby.astro';
import Spaghetti from './Spaghetti.astro';
import Squidward from './Squidward.astro';
import './gags.css';

/** An image's file name without its extension: what a gag finds it by at runtime. */
export const stemOf = (image: string) => image.split('/').pop()!.replace(/\.[^.]+$/, '');

export const GAGS = [
  { image: '2026/09/spaghetti.gif', component: Spaghetti },
  { image: '2026/09/clippy-help.png', component: Clippy },
  { image: '2026/09/sf-sisyphus.png', component: Nuke },
  { image: '2026/09/scooby-doo-unmask.png', component: Scooby },
  { image: '2026/09/squidward-vibecoders.png', component: Squidward },
  { image: '2026/09/pepe-shareholder-value.png', component: Pepe },
  { image: '2019/02/1-SVhxZirBmoi8QIernVEZcw.jpeg', component: Gnome },   // RecyclerView in 2019's hero
  { image: '2019/02/1-1P6zmM3E0UpxGyEa_SfL_Q.jpeg', component: Gnome },   // Glide review's hero
];

/** The gags whose images a post uses: `body` is its Markdown, `hero` its feature_image as written. */
export const gagsIn = (body = '', hero = '') =>
  GAGS.filter((g) => body.includes(`images/${g.image}`) || hero.endsWith(`images/${g.image}`));
