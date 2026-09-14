import { useEffect, type ReactNode } from 'react';

/** Suppress browser gestures without interfering with game clicks or editable fields. */
export function GameInput({ children }: { children: ReactNode }): React.ReactElement {
  useEffect(() => {
    const context = (event: MouseEvent) => event.preventDefault();
    const drag = (event: DragEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('input,textarea,[contenteditable="true"]')) event.preventDefault();
    };
    document.addEventListener('contextmenu', context, true);
    document.addEventListener('dragstart', drag);
    return () => {
      document.removeEventListener('contextmenu', context, true);
      document.removeEventListener('dragstart', drag);
    };
  }, []);
  return <>{children}</>;
}
