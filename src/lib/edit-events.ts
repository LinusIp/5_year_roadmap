/**
 * Plan edits announce themselves so the toast can say what happened and offer Undo ("Moved CS231n to Year 2 ·
 * Undo"). A tiny event bus: no state library, no context provider.
 */
export interface EditEvent {
  group: string;
  label: string;
}

type Listener = (event: EditEvent) => void;
const listeners = new Set<Listener>();

export function announceEdit(event: EditEvent): void {
  for (const listener of listeners) listener(event);
}

export function onEdit(listener: Listener): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
