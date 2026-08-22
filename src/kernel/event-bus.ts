import type { DomainEvent } from '../contracts/core/messages.js';

export type EventHandler = (e: DomainEvent) => void;
export type Unsubscribe = () => void;

export interface EventBus {
  /** 僅 Transaction.commit 後呼叫（05 §2）。 */
  publish(events: readonly DomainEvent[]): void;
  subscribe(kind: string, h: EventHandler): Unsubscribe;
  subscribeAll(h: EventHandler): Unsubscribe;
}

export function createEventBus(): EventBus {
  const byKind = new Map<string, Set<EventHandler>>();
  const all = new Set<EventHandler>();

  return {
    publish(events) {
      for (const e of events) {
        for (const h of byKind.get(e.kind) ?? []) h(e);
        for (const h of all) h(e);
      }
    },
    subscribe(kind, h) {
      const set = byKind.get(kind) ?? new Set<EventHandler>();
      set.add(h);
      byKind.set(kind, set);
      return () => { set.delete(h); };
    },
    subscribeAll(h) {
      all.add(h);
      return () => { all.delete(h); };
    },
  };
}
