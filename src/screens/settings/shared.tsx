import type { ReactNode } from 'react';
import { updateSettings } from '../../db/settings.ts';
import type { StoredSettings } from '../../db/types.ts';
import { today } from '../../lib/dates.ts';
import { withScheduleEdit } from '../../lib/day-plan.ts';
import { seed } from '../../seed/index.ts';
import { SettingsDefaultsSchema } from '../../seed/schema.ts';
import type { SettingsDefaults } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { DEFAULT_FOCUS_PREFS } from '../../lib/focus.ts';
import type { FocusPrefs } from '../../lib/focus.ts';

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** A date for each weekday (4 to 10 January 2026 run Sunday to Saturday), to name days with dayName. */
export const DATE_OF_DAY = ['2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10'];

/** The parts of the core settings that decide what a day plans. Editing them keeps the past's plan in history. */
function scheduleOf(core: SettingsDefaults): string {
  return JSON.stringify([core.templates, core.pattern, core.blocks.map((b) => [b.id, b.minutes, b.days])]);
}

/**
 * Saves a change to the core settings only if the result still passes the schema of data/settings.yaml. A
 * change to templates, the weekly pattern or block minutes applies from today: earlier days keep their plan.
 */
export async function saveCore(change: (core: SettingsDefaults) => SettingsDefaults): Promise<string | null> {
  let problem: string | null = null;
  await updateSettings(seed.settings, (current) => {
    const parsed = SettingsDefaultsSchema.safeParse(change(structuredClone(current.core)));
    if (!parsed.success) {
      problem = parsed.error.issues[0]?.message ?? 'That value is not allowed.';
      return current;
    }
    const next = { ...current, core: parsed.data };
    return scheduleOf(parsed.data) === scheduleOf(current.core) ? next : withScheduleEdit(current, today(), () => next);
  });
  return problem === 'must be strictly ascending' ? 'Each heatmap level must start above the one before it.' : problem;
}

/** Saves a change to the settings outside the core (schedule, pace, layout). */
export async function saveSettings(change: (current: StoredSettings) => StoredSettings): Promise<void> {
  await updateSettings(seed.settings, change);
}

/** Saves a change to the Focus tab's preferences (ATLAS-FOCUS-MUSIC). */
export function saveFocusPrefs(change: (prefs: FocusPrefs) => FocusPrefs): void {
  void saveSettings((s) => ({ ...s, focus: change(structuredClone(s.focus ?? DEFAULT_FOCUS_PREFS)) }));
}

export function Section({ id, title, children, onReset }: { id?: string; title: string; children: ReactNode; onReset?: () => void }) {
  return (
    <section id={id} className="mt-6 scroll-mt-4">
      <div className="mb-2 flex items-end justify-between gap-3">
        <h2 className="section-label mb-0">{title}</h2>
        {onReset && (
          <Button size="sm" variant="icon" className="-my-2 text-meta" onClick={onReset}>
            Reset to default
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

export function Problem({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="mt-2 text-meta font-medium text-ink">
      {text}
    </p>
  ) : null;
}

/** "every day", "Mon to Fri", or the days by name. */
export function describeDays(days: number[]): string {
  if (days.length === 7) return 'every day';
  if (days.join() === '1,2,3,4,5') return 'Mon to Fri';
  if (days.length === 0) return 'no days';
  return days.map((d) => DAY_SHORT[d]).join(', ');
}

/** "2026-12-12" typed into a field: a real date, or null. */
export function parseDateInput(text: string): string | null {
  const t = text.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(t + 'T12:00:00');
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== t ? null : t;
}
