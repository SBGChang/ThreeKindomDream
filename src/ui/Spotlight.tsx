import {useLayoutEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import {raiseSpotlight, type RaisedSpotlight} from './spotlight-layer.js';
import './spotlight.css';

/** Mark complete painted surfaces, including artwork beside transparent hit targets. */
export function spotlightTarget(active = true): {'data-spotlight-target'?: string} {
  return active ? {'data-spotlight-target': ''} : {};
}

/** Scoped to this component's parent; several independent surfaces can stay lit together.
 * dim preserves screen shortcuts; lock gates outside interaction for guided tutorials.
 * Suspend active while a pause menu or dialogue owns the screen.
 */
export function Spotlight({active, mode = 'dim'}: {active: boolean; mode?: 'dim' | 'lock'}): React.ReactElement {
  const marker = useRef<HTMLSpanElement>(null), backdrop = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const scope = marker.current?.parentElement, mask = backdrop.current;
    if (!active || !scope || !mask || typeof mask.showPopover !== 'function') return;
    const raised = new Map<HTMLElement, RaisedSpotlight>();
    let frame = 0;
    const update = () => {
      const candidates = Array.from(scope.querySelectorAll<HTMLElement>('[data-spotlight-target]'));
      // Promoting a parent already promotes its children; never create nested placeholders.
      const targets = candidates.filter(el => !candidates.some(parent => parent !== el && parent.contains(el)) && el.checkVisibility());
      for (const [el, spot] of raised) if (!targets.includes(el)) {spot.release(); raised.delete(el);}
      if (!targets.length) {
        if (mask.matches(':popover-open')) mask.hidePopover();
        return;
      }
      if (!mask.matches(':popover-open')) mask.showPopover();
      for (const el of targets) {
        if (!raised.has(el)) raised.set(el, raiseSpotlight(el));
        const rect = raised.get(el)!.update();
        if (rect.width <= 1 || rect.height <= 1) {raised.get(el)!.release(); raised.delete(el);}
      }
      if (!raised.size && mask.matches(':popover-open')) mask.hidePopover();
    };
    const loop = () => {update(); frame = requestAnimationFrame(loop);};
    const controls = () => Array.from(raised.keys()).flatMap(el => [el, ...el.querySelectorAll<HTMLElement>('button,input,select,textarea,a[href],[tabindex]')])
      .filter(el => el.tabIndex >= 0 && !el.matches(':disabled') && !el.closest('[inert]') && el.checkVisibility());
    const guard = (event: Event) => {
      if (mode !== 'lock' || !raised.size) return;
      const inside = event.target instanceof Node && [...raised.keys()].some(el => el.contains(event.target as Node));
      if (event instanceof KeyboardEvent && event.key === 'Tab') {
        event.preventDefault(); event.stopImmediatePropagation();
        const items = controls(), index = items.indexOf(document.activeElement as HTMLElement);
        const next = index < 0 ? (event.shiftKey ? items.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + items.length) % items.length;
        (items[next] ?? mask).focus({preventScroll: true});
        return;
      }
      if (inside && !(event instanceof KeyboardEvent && event.key === 'Escape') && event.type !== 'contextmenu') return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.type === 'focusin') (controls()[0] ?? mask).focus({preventScroll: true});
    };
    // Capture before document-level game navigation and pointer handlers.
    const events = ['pointerdown', 'click', 'dblclick', 'contextmenu', 'keydown', 'focusin'] as const;
    for (const name of events) window.addEventListener(name, guard, true);
    update(); frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      for (const name of events) window.removeEventListener(name, guard, true);
      for (const spot of raised.values()) spot.release();
      if (mask.matches(':popover-open')) mask.hidePopover();
    };
  }, [active, mode]);
  return <><span ref={marker} hidden/>{createPortal(<div ref={backdrop} popover="manual" data-spotlight-mask data-mode={mode} tabIndex={-1} aria-hidden="true"/>, document.body)}</>;
}
