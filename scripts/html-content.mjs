import { parseHTML } from 'linkedom';
import { textKey } from '../cms/lib.mjs';

// Work on complete rich-text phrases so emphasis and line breaks stay in place.
const richTags = new Set(['H1', 'H2', 'H3', 'P', 'LABEL', 'BUTTON', 'SUMMARY', 'OPTION', 'A']);
const inlineTags = new Set(['BR', 'EM', 'STRONG', 'B', 'I']);
export const attributes = ['aria-label', 'placeholder', 'alt', 'data-open-label', 'data-close-label', 'data-success', 'data-error', 'data-pending'];
const meaningful = value => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2}/.test(value) && !/^(?:https?:|mailto:|tel:|[\w.+-]+@)/.test(value) && !/^(?:©\s*\d{4}\s+)?BULL\s*(?:&amp;|&)\s*BEAR(?:\s*\/\s*INSURANCE BROKER| INSURANCE BROKER)?$/i.test(value.trim());
const clean = value => value.trim();
export function scan(html, transform = value => value) {
  const { document } = parseHTML(html);
  const seen = [];
  function visit(node) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.nodeName)) return;
    if (node.nodeType === 3) {
      const value = clean(node.textContent);
      if (meaningful(value) && !/^©\s*\d{4}/.test(value)) { seen.push(value); node.textContent = node.textContent.replace(value, transform(value)); }
      return;
    }
    if (node.nodeType !== 1 && node.nodeType !== 9) return;
    if (node.nodeType === 1) {
      for (const attr of attributes) {
        const value = node.getAttribute(attr);
        if (value && meaningful(value)) { seen.push(value); node.setAttribute(attr, transform(value)); }
      }
      if (node.nodeName === 'META' && ['description', 'og:title', 'og:description', 'og:image:alt', 'twitter:title', 'twitter:description'].includes(node.getAttribute('name') || node.getAttribute('property'))) {
        const value = node.getAttribute('content');
        if (value) { seen.push(value); node.setAttribute('content', transform(value)); }
      }
      if (richTags.has(node.nodeName) && [...node.children].every(child => inlineTags.has(child.nodeName)) && meaningful(node.textContent)) {
        const value = clean(node.innerHTML);
        seen.push(value); node.innerHTML = node.innerHTML.replace(value, transform(value));
        return;
      }
    }
    for (const child of [...node.childNodes]) visit(child);
  }
  visit(document);
  return { document, texts: [...new Set(seen)].map(value => ({ key: textKey(value), value })) };
}
