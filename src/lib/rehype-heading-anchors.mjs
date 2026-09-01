// Append a "#" link to every h2–h4 that has an id, so a section can be deep
// linked. Works without JS (it is a plain anchor); the script in [slug].astro
// additionally copies the link on click. Needs Astro's rehypeHeadingIds to
// run first, which astro.config.mjs takes care of.
import { visit } from 'unist-util-visit';

export default function headingAnchors() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (!/^h[234]$/.test(node.tagName) || !node.properties?.id) return;
      node.children.push({
        type: 'element',
        tagName: 'a',
        properties: { className: ['anchor'], href: `#${node.properties.id}`, ariaLabel: 'Link to this section' },
        children: [{ type: 'text', value: '#' }],
      });
    });
  };
}
