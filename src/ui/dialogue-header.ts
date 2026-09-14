import { createContext, type Dispatch, type SetStateAction } from 'react';
export interface DialogueHeader { title: string; kind: string; rarity: number }
export const DialogueHeaderContext = createContext<Dispatch<SetStateAction<DialogueHeader | null>>>(() => {});
