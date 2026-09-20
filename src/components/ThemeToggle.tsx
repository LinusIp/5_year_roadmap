import { Icon } from './Icon.tsx';
import { updateSettings } from '../db/settings.ts';
import { resolveTheme } from '../lib/theme.ts';
import type { StoredSettings } from '../db/types.ts';
import type { SettingsDefaults } from '../seed/schema.ts';

interface ThemeToggleProps {
  settings: StoredSettings;
  core: SettingsDefaults;
  compact?: boolean;
}

export function ThemeToggle({ settings, core, compact }: ThemeToggleProps) {
  const current = resolveTheme(settings.theme);
  const next = current === 'dark' ? 'light' : 'dark';
  const label = 'Switch to ' + next + ' theme';
  const toggle = (): void => {
    void updateSettings(core, (s) => ({ ...s, theme: next }));
  };
  if (compact) {
    return (
      <button type="button" className="btn btn-ghost btn-icon" onClick={toggle} aria-label={label} title={label}>
        <Icon name={current === 'dark' ? 'sun' : 'moon'} />
      </button>
    );
  }
  return (
    <button type="button" className="btn btn-ghost w-full justify-start gap-3 px-3" onClick={toggle}>
      <Icon name={current === 'dark' ? 'sun' : 'moon'} />
      {next === 'light' ? 'Light theme' : 'Dark theme'}
    </button>
  );
}
