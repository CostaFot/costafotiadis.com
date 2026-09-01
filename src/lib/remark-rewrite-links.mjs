// Ghost exported every internal link as an absolute www.costafotiadis.com
// URL. Rewrite those to site-relative /<slug>/ so they resolve on any host
// (Railway preview included) and drop the ?ref= tracking Ghost appended.
import { visit } from 'unist-util-visit';

const SELF = /^https?:\/\/(?:www\.)?costafotiadis\.com(\/[^?#]*)?(\?[^#]*)?(#.*)?$/;

export default function rewriteLinks() {
  return (tree) => {
    visit(tree, ['link', 'definition'], (node) => {
      const m = SELF.exec(node.url);
      if (!m) {
        node.url = node.url.replace(/\?ref=costafotiadis\.com$/, '');
        return;
      }
      let pathname = m[1] || '/';
      if (!pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(pathname)) pathname += '/';
      node.url = pathname + (m[3] || '');
    });
  };
}
