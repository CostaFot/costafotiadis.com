// Gags drawn over a meme in a post (ClippyGag, NukeGag). The memes are flat
// images, so a gag lays a layer exactly over one and works in the image's own
// pixels: the layer carries --s, the rendered width over the natural one.

/** The post image whose file is `name` (Astro renames it, the stem survives). */
export const memeImage = (name: string) =>
  document.querySelector<HTMLImageElement>(`.prose img[src*="${name}."]`);

/**
 * Lays an element on the picture's content box, whatever border a skin gives
 * it, and keeps it there. Measured off the rects rather than offsetLeft and
 * clientWidth, which round to whole pixels and leave a patch a pixel out at
 * fractional scaling.
 */
export function overlay(img: HTMLImageElement, className: string, naturalWidth: number) {
  const host = img.parentElement!;
  const layer = document.createElement('span');
  layer.className = className;
  layer.style.position = 'absolute';
  host.style.position = 'relative';
  host.append(layer);
  const place = () => {
    const i = img.getBoundingClientRect(), h = host.getBoundingClientRect(), cs = getComputedStyle(img);
    const [t, r, b, l] = ['top', 'right', 'bottom', 'left'].map((s) => parseFloat(cs.getPropertyValue(`border-${s}-width`)) || 0);
    const w = i.width - l - r;
    Object.assign(layer.style, { left: `${i.left - h.left + l}px`, top: `${i.top - h.top + t}px`, width: `${w}px`, height: `${i.height - t - b}px` });
    layer.style.setProperty('--s', String(w / naturalWidth));
  };
  const ro = new ResizeObserver(place);
  ro.observe(host);
  ro.observe(img, { box: 'border-box' });
  place();
  return layer;
}
