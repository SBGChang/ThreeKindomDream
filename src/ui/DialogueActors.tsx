import { useLayoutEffect, useRef } from 'react';
import type {
  DialogueMove,
  DialoguePoint,
} from '../contracts/core/dialogue.js';
import type { CareerPresentation } from './career-presentation.js';
import { CareerHero } from './CareerTheater.js';
import { CharacterArt } from './CharacterArt.js';
export interface SceneActor {
  readonly name: string;
  readonly hero?: boolean;
}
const transform = (p: DialoguePoint) =>
  `translate(${p.x * 12.8 - 205}px, ${p.y ?? 0}px) rotate(${p.rotate ?? 0}deg)`;
export const actorHome = (index: number, count: number): DialoguePoint => ({
  x:
    index === 0
      ? 25
      : count > 3
        ? 46 + (index - 1) * 19
        : count > 2
          ? 58 + (index - 1) * 22
          : 77,
});
export function DialogueActor({
  actor,
  index,
  home,
  move,
  cue,
  speaking,
  profile,
  reduced,
}: {
  actor: SceneActor;
  index: number;
  home: DialoguePoint;
  move?: DialogueMove;
  cue: string;
  speaking: boolean;
  profile: CareerPresentation;
  reduced: boolean;
}): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!move || !ref.current || reduced) return;
    const animation = ref.current.animate(
      move.path.map((p) => ({
        transform: transform(p),
        opacity: p.opacity ?? 1,
      })),
      { duration: move.duration, easing: 'ease-in-out', fill: 'both' },
    );
    return () => animation.cancel();
  }, [cue, move, reduced]);
  return (
    <div
      ref={ref}
      className={'dialogue-actor ' + (speaking ? 'is-speaking' : '')}
      data-actor={index}
      style={{ transform: transform(home), opacity: home.opacity ?? 1 }}
    >
      {actor.hero ? (
        <CareerHero profile={profile} />
      ) : (
        <CharacterArt name={actor.name} />
      )}
    </div>
  );
}
export function DialogueFace({
  actor,
  profile,
}: {
  actor: SceneActor;
  profile: CareerPresentation;
}): React.ReactElement {
  return (
    <div className={'dialogue-face ' + (actor.hero ? 'is-hero' : '')}>
      {actor.hero ? (
        <CareerHero profile={profile} />
      ) : (
        <CharacterArt name={actor.name} portrait context="dialogue" />
      )}
    </div>
  );
}
