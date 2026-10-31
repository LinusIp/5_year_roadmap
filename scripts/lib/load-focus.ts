/** Reads data/focus-sessions.json and checks its shape (ATLAS-FOCUS-MUSIC); the oEmbed check is scripts/focus-verify.ts. */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { focusProblems, FocusSessionsSchema } from '../../src/seed/focus.ts';
import type { FocusSession } from '../../src/seed/focus.ts';
import { REPO_ROOT } from './load-seed.ts';

export const FOCUS_PATH = join(REPO_ROOT, 'data', 'focus-sessions.json');

export function loadFocusSessions(path: string = FOCUS_PATH): { sessions: FocusSession[] | null; errors: string[] } {
  if (!existsSync(path)) return { sessions: null, errors: ['focus-sessions.json: missing'] };
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    return { sessions: null, errors: ['focus-sessions.json: not JSON: ' + String(err)] };
  }
  const errors = focusProblems(json);
  return { sessions: errors.length > 0 ? null : FocusSessionsSchema.parse(json), errors };
}
