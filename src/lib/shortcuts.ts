/**
 * Single-key shortcuts: t Today, r the Plan (roadmap), / search, l log time, ? the list of them.
 *
 * They never fire while the user is typing, with Ctrl, Alt or Meta held (those belong to the browser and the
 * system), or while a dialog is open. Single-character shortcuts can also be turned off in Settings, which
 * WCAG 2.1.4 asks for: speech-input users can trigger them by accident.
 */
export type ShortcutAction = 'today' | 'roadmap' | 'search' | 'log' | 'help';

export const SHORTCUTS: readonly { key: string; action: ShortcutAction; label: string }[] = [
  { key: 't', action: 'today', label: 'Go to Today' },
  { key: 'r', action: 'roadmap', label: 'Go to the Plan' },
  { key: '/', action: 'search', label: 'Search the library' },
  { key: 'l', action: 'log', label: 'Log time on Today' },
  { key: '?', action: 'help', label: 'Show these shortcuts' },
];

/** The `meta` key for the on/off switch. On unless turned off. */
export const SHORTCUTS_META_KEY = 'keyboardShortcuts';

/** Inputs where a letter is not text: a shortcut is fine while one of these has focus. */
const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image']);

/** True while a key press would type into something. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type);
  return target.closest('textarea, select, [contenteditable]:not([contenteditable="false"])') !== null;
}

type KeyInfo = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'isComposing' | 'defaultPrevented' | 'target'>;

/** The action a key press asks for, or null. Shift is allowed: "?" needs it on most layouts. */
export function shortcutFor(event: KeyInfo): ShortcutAction | null {
  if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isTypingTarget(event.target)) return null;
  return SHORTCUTS.find((shortcut) => shortcut.key === event.key)?.action ?? null;
}

/*
 * "Log time" and "show the shortcuts" are requests from anywhere to a component that may not be on screen yet
 * (Today, after navigating to it). A request waits until something takes it.
 */
function channel() {
  let pending = false;
  const listeners = new Set<() => void>();
  return {
    request(): void {
      pending = true;
      for (const listener of listeners) listener();
    },
    take(): boolean {
      const was = pending;
      pending = false;
      return was;
    },
    listen(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const logTimeRequests = channel();
export const helpRequests = channel();
