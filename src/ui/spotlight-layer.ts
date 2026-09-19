/** Promote the original element without reparenting or remounting its React tree. */
export interface RaisedSpotlight {
  surface: HTMLElement;
  update: () => DOMRect;
  release: () => void;
}

const prefix = '--spotlight-';
const presentation = ['display', 'background', 'color', 'padding', 'border', 'overflow', 'box-sizing'] as const;

export function raiseSpotlight(surface: HTMLElement): RaisedSpotlight {
  const anchor = surface.cloneNode(true) as HTMLElement;
  const oldPopover = surface.getAttribute('popover');
  const hadStyle = surface.hasAttribute('style');
  const saved = new Map<string, {value: string; priority: string}>();
  const set = (name: string, value: string) => {
    const key = prefix + name;
    if (!saved.has(key)) saved.set(key, {value: surface.style.getPropertyValue(key), priority: surface.style.getPropertyPriority(key)});
    if (surface.style.getPropertyValue(key) !== value) surface.style.setProperty(key, value);
  };
  const clean = (node: HTMLElement) => {
    for (const el of [node, ...node.querySelectorAll<HTMLElement>('*')]) {
      for (const attr of Array.from(el.attributes)) {
        if (['id', 'name', 'autofocus', 'popover', 'aria-label', 'aria-labelledby', 'aria-describedby'].includes(attr.name) || attr.name.startsWith('data-spotlight-')) el.removeAttribute(attr.name);
      }
      if (el.style) for (const key of Array.from(el.style)) if (key.startsWith(prefix)) el.style.removeProperty(key);
    }
    node.setAttribute('data-spotlight-placeholder', '');
    node.setAttribute('aria-hidden', 'true');
    node.inert = true;
  };
  clean(anchor);
  surface.after(anchor);
  const sourceStyle = () => surface.style.cssText.replace(/--spotlight-[^:;]+:[^;]+;?/g, '').trim();
  let previousStyle = sourceStyle(), dirty = false;
  const observer = new MutationObserver(records => {
    if (records.some(r => r.target !== surface || r.type !== 'attributes' || !['style', 'popover', 'data-spotlight-raised'].includes(r.attributeName ?? '')) || sourceStyle() !== previousStyle) dirty = true;
  });
  const update = () => {
    if (dirty) {
      const copy = surface.cloneNode(true) as HTMLElement;
      clean(copy);
      for (const attr of Array.from(anchor.attributes)) anchor.removeAttribute(attr.name);
      for (const attr of Array.from(copy.attributes)) anchor.setAttribute(attr.name, attr.value);
      anchor.replaceChildren(...Array.from(copy.childNodes));
      previousStyle = sourceStyle();
      dirty = false;
    }
    const rect = anchor.getBoundingClientRect(), css = getComputedStyle(anchor);
    let matrix = new DOMMatrix();
    for (let el: Element | null = anchor; el; el = el.parentElement) {
      if (el instanceof SVGGraphicsElement) {
        const ctm = el.getScreenCTM();
        if (ctm) matrix = new DOMMatrix([ctm.a, ctm.b, ctm.c, ctm.d, 0, 0]).multiply(matrix);
        break;
      }
      const transform = getComputedStyle(el).transform;
      if (transform !== 'none') matrix = new DOMMatrix(transform).multiply(matrix);
    }
    const width = parseFloat(css.width) + (css.boxSizing === 'border-box' ? 0 : parseFloat(css.paddingLeft) + parseFloat(css.paddingRight) + parseFloat(css.borderLeftWidth) + parseFloat(css.borderRightWidth));
    const height = parseFloat(css.height) + (css.boxSizing === 'border-box' ? 0 : parseFloat(css.paddingTop) + parseFloat(css.paddingBottom) + parseFloat(css.borderTopWidth) + parseFloat(css.borderBottomWidth));
    const xs = [0, matrix.a * width, matrix.c * height, matrix.a * width + matrix.c * height];
    const ys = [0, matrix.b * width, matrix.d * height, matrix.b * width + matrix.d * height];
    set('left', `${rect.left - Math.min(...xs)}px`);
    set('top', `${rect.top - Math.min(...ys)}px`);
    set('width', css.width);
    set('height', css.height);
    set('matrix', `matrix(${matrix.a},${matrix.b},${matrix.c},${matrix.d},0,0)`);
    for (const property of presentation) set(property, css.getPropertyValue(property));
    return rect;
  };
  update();
  surface.setAttribute('data-spotlight-raised', '');
  surface.setAttribute('popover', 'manual');
  surface.showPopover();
  observer.observe(surface, {subtree: true, childList: true, characterData: true, attributes: true});
  return {surface, update, release: () => {
    observer.disconnect();
    if (surface.matches(':popover-open')) surface.hidePopover();
    surface.removeAttribute('data-spotlight-raised');
    if (oldPopover === null) surface.removeAttribute('popover'); else surface.setAttribute('popover', oldPopover);
    for (const [key, {value, priority}] of saved) {
      if (value) surface.style.setProperty(key, value, priority); else surface.style.removeProperty(key);
    }
    if (!hadStyle && !surface.style.length) surface.removeAttribute('style');
    anchor.remove();
  }};
}
