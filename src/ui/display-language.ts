import { Converter } from 'opencc-js/t2cn';

export type GameLanguage = 'zh-TW' | 'zh-CN';
const simplify = Converter({ from: 'twp', to: 'cn' });
let language: GameLanguage = 'zh-TW';
const listeners = new Set<() => void>();
// Keep originals across StrictMode effect replays without retaining detached DOM nodes.
const originals = new WeakMap<Node, Map<string, { source: string; displayed: string }>>();
export function setDisplayLanguage(next: GameLanguage): void {
  document.documentElement.lang = next;
  if (next === language) return;
  language = next;
  listeners.forEach(refresh => refresh());
}

/** Presentation only: retain authored text and React's existing nodes, IDs and game data. */
export function observeDisplayLanguage(root: HTMLElement): () => void {
  const attributes = ['aria-label', 'aria-description', 'aria-valuetext', 'title', 'alt', 'placeholder'];
  const skip = (node: Node) => (node instanceof Element ? node : node.parentElement)?.closest('[translate="no"],script,style');
  const convert = (node: Node, key: string, current: string, write: (value: string) => void) => {
    let values = originals.get(node);
    if (!values) { values = new Map(); originals.set(node, values); }
    const old = values.get(key);
    // A different DOM value was authored by a new render, not by this converter.
    const source = old && current === old.displayed ? old.source : current;
    const displayed = language === 'zh-CN' ? simplify(source) : source;
    values.set(key, { source, displayed });
    if (current !== displayed) write(displayed);
  };
  const visit = (node: Node) => {
    if (skip(node)) return;
    if (node instanceof Text) convert(node, 'text', node.data, text => { node.data = text; });
    else if (node instanceof Element) for (const attr of attributes) {
      const value = node.getAttribute(attr);
      if (value !== null) convert(node, attr, value, text => node.setAttribute(attr, text));
      else originals.get(node)?.delete(attr);
    }
  };
  const walk = (node: Node) => {
    visit(node);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let child: Node | null;
    while ((child = walker.nextNode())) visit(child);
  };
  const refresh = () => walk(root);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (!root.contains(record.target)) continue;
      if (record.type === 'childList') record.addedNodes.forEach(walk);
      else visit(record.target);
    }
  });
  observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
  listeners.add(refresh); refresh();
  return () => { observer.disconnect(); listeners.delete(refresh); };
}
