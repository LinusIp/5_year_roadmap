import { updateSettings } from '../../db/settings.ts';
import type { StoredSettings } from '../../db/types.ts';
import { announceEdit } from '../../lib/edit-events.ts';
import type { SettingsDefaults } from '../../seed/schema.ts';

/**
 * A calendar edit: changes the schedule in settings and offers Undo in the toast ("Moved Graphics to 19:00 ·
 * Undo"). Undo puts back the schedule and templates as they were just before, and nothing else.
 */
export async function calendarEdit(core: SettingsDefaults, label: string, change: (s: StoredSettings) => StoredSettings): Promise<void> {
  let before: Pick<StoredSettings, 'schedule' | 'core'> | null = null;
  await updateSettings(core, (current) => {
    before = { schedule: current.schedule, core: current.core };
    return change(current);
  });
  const saved = before as Pick<StoredSettings, 'schedule' | 'core'> | null;
  if (!saved) return;
  announceEdit({
    group: 'calendar:' + Date.now(),
    label,
    undo: async () => {
      await updateSettings(core, (current) => ({ ...current, schedule: saved.schedule, core: saved.core }));
      return true;
    },
  });
}
