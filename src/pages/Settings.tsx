import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Icon } from '../components/Icon.tsx';
import { Page } from '../components/Page.tsx';
import { backupFileName, createBackup, importBackup, markBackedUp, resetAll, serialiseBackup } from '../db/backup.ts';
import { db } from '../db/db.ts';
import { defaultSettings, updateSettings } from '../db/settings.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { formatMinutes, today as todayDate } from '../lib/dates.ts';
import { weeklyTargetMinutes } from '../lib/schedule.ts';
import { heatLabel } from '../lib/streaks.ts';
import { SettingsDefaultsSchema } from '../seed/schema.ts';
import type { SettingsDefaults } from '../seed/schema.ts';
import { seed } from '../seed/index.ts';
import type { StoredSettings, Theme } from '../db/types.ts';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Section({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section className="card mb-4 p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {lead && <p className="mt-0.5 text-sm text-ink-2">{lead}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Saves a change to the core settings only if the result still passes the same schema as data/settings.yaml. */
async function saveCore(change: (core: SettingsDefaults) => SettingsDefaults): Promise<string | null> {
  let problem: string | null = null;
  await updateSettings(seed.settings, (current) => {
    const next = change(structuredClone(current.core));
    const parsed = SettingsDefaultsSchema.safeParse(next);
    if (!parsed.success) {
      problem = parsed.error.issues[0]?.message ?? 'That value is not allowed.';
      return current;
    }
    return { ...current, core: parsed.data };
  });
  return problem;
}

function NumberField({ label, value, suffix, min, max, onCommit }: { label: string; value: number; suffix?: string; min: number; max: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          type="number"
          className="input num w-24"
          min={min}
          max={max}
          value={draft ?? String(value)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = Number(draft);
            if (draft !== null && Number.isFinite(n) && n >= min && n <= max) onCommit(Math.round(n));
            setDraft(null);
          }}
        />
        {suffix && <span className="text-xs text-ink-3">{suffix}</span>}
      </span>
    </label>
  );
}

function Blocks({ settings }: { settings: StoredSettings }) {
  const [problem, setProblem] = useState<string | null>(null);
  const run = async (change: (core: SettingsDefaults) => SettingsDefaults): Promise<void> => setProblem(await saveCore(change));
  const weekly = weeklyTargetMinutes(settings);
  return (
    <Section title="Blocks" lead={'Your day, block by block. Currently ' + formatMinutes(weekly / 7) + ' a day on average, ' + formatMinutes(weekly) + ' a week. Raise them in stage 2, once university is over.'}>
      <div className="space-y-4">
        {settings.core.blocks.map((block, index) => (
          <div key={block.id} className="rounded-lg border border-line p-3">
            <div className="grid gap-3 sm:grid-cols-[3rem_1fr_auto]">
              <span className="eyebrow pt-7">Block {block.id}</span>
              <label className="block">
                <span className="label">Name</span>
                <input
                  className="input"
                  defaultValue={block.name}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name && name !== block.name) void run((core) => ((core.blocks[index]!.name = name), core));
                  }}
                />
              </label>
              <NumberField label="Minutes a day" value={block.minutes} min={0} max={720} onCommit={(n) => void run((core) => ((core.blocks[index]!.minutes = n), core))} />
            </div>
            <fieldset className="mt-3">
              <legend className="label">Days</legend>
              <div className="flex flex-wrap gap-1">
                {DAYS.map((day, d) => {
                  const on = block.days.includes(d);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={on}
                      className={'btn btn-sm w-12' + (on ? ' btn-primary' : '')}
                      onClick={() =>
                        void run((core) => {
                          const days = core.blocks[index]!.days;
                          core.blocks[index]!.days = on ? days.filter((x) => x !== d) : [...days, d].sort();
                          return core;
                        })
                      }
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Weekly review day</span>
          <select className="input" value={settings.core.review.day} onChange={(e) => void run((core) => ((core.review.day = Number(e.target.value)), core))}>
            {DAYS.map((day, d) => (
              <option key={day} value={d}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Week starts on</span>
          <select className="input" value={settings.core.weekStartsOn} onChange={(e) => void run((core) => ((core.weekStartsOn = Number(e.target.value) as 0 | 1), core))}>
            <option value={1}>Monday</option>
            <option value={0}>Sunday</option>
          </select>
        </label>
      </div>
      {problem && (
        <p role="alert" className="mt-3 text-sm text-critical-text">
          {problem}
        </p>
      )}
    </Section>
  );
}

function HeatAndStreak({ settings }: { settings: StoredSettings }) {
  const [problem, setProblem] = useState<string | null>(null);
  const run = async (change: (core: SettingsDefaults) => SettingsDefaults): Promise<void> => setProblem(await saveCore(change));
  const t = settings.core.heatmapThresholds;
  return (
    <Section title="Heatmap and streak" lead="Where each heatmap step starts, and what keeps a streak going.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([0, 1, 2, 3] as const).map((i) => (
          <NumberField
            key={i}
            label={'Level ' + (i + 1) + ' from'}
            suffix="min"
            value={t[i]}
            min={1}
            max={1440}
            onCommit={(n) =>
              void run((core) => {
                core.heatmapThresholds[i] = n;
                return core;
              })
            }
          />
        ))}
      </div>
      <p className="num mt-2 text-xs text-ink-3">{([1, 2, 3, 4] as const).map((l) => 'Level ' + l + ': ' + heatLabel(l, t)).join(' · ')}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <NumberField label="A day counts from" suffix="min" value={settings.core.streak.minMinutes} min={1} max={1440} onCommit={(n) => void run((core) => ((core.streak.minMinutes = n), core))} />
        <NumberField label="Freeze days a month" value={settings.core.streak.freezesPerMonth} min={0} max={31} onCommit={(n) => void run((core) => ((core.streak.freezesPerMonth = n), core))} />
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" className="size-4 accent-[var(--accent-fill)]" checked={settings.core.streak.autoFreeze} onChange={(e) => void run((core) => ((core.streak.autoFreeze = e.target.checked), core))} />
          Spend freezes automatically
        </label>
      </div>
      {problem && (
        <p role="alert" className="mt-3 text-sm text-critical-text">
          {problem === 'must be strictly ascending' ? 'Each heatmap level must start above the one before it.' : problem}
        </p>
      )}
    </Section>
  );
}

function Appearance({ settings }: { settings: StoredSettings }) {
  return (
    <Section title="Appearance">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Theme">
        {(['dark', 'light', 'system'] as const).map((theme: Theme) => (
          <button
            key={theme}
            type="button"
            role="radio"
            aria-checked={settings.theme === theme}
            className={'btn btn-sm' + (settings.theme === theme ? ' btn-primary' : '')}
            onClick={() => void updateSettings(seed.settings, (s) => ({ ...s, theme }))}
          >
            <Icon name={theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'settings'} size={13} />
            {theme === 'system' ? 'Follow the system' : theme[0]!.toUpperCase() + theme.slice(1)}
          </button>
        ))}
      </div>
    </Section>
  );
}

function Backup({ settings }: { settings: StoredSettings }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState('');
  const counts = useLiveQuery(async () => ({ logs: await db.dayLogs.count(), states: await db.itemStates.count() }), []);

  const exportNow = async (): Promise<void> => {
    const text = serialiseBackup(await createBackup());
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName();
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    await markBackedUp();
    setMessage({ tone: 'good', text: 'Saved ' + backupFileName() + '. Keep it somewhere that is not this browser.' });
  };

  const importFile = async (file: File): Promise<void> => {
    const result = await importBackup(await file.text());
    if (result.ok) {
      const total = Object.values(result.counts).reduce((a, b) => a + b, 0);
      setMessage({ tone: 'good', text: 'Restored ' + total + ' records from ' + file.name + '.' });
    } else {
      setMessage({ tone: 'bad', text: 'Nothing was changed. ' + result.errors.join(' ') });
    }
  };

  return (
    <Section
      title="Backup"
      lead={'Everything you log lives only in this browser. Export it now and then; Atlas reminds you every ' + settings.core.backupReminderDays + ' days.'}
    >
      <p className="num mb-3 text-xs text-ink-3">
        {counts ? counts.logs + ' days logged, ' + counts.states + ' items with progress' : ''}
        {settings.backup.lastBackupAt ? ' · last backup ' + settings.backup.lastBackupAt : ' · never backed up'}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary" onClick={() => void exportNow()}>
          <Icon name="download" size={15} />
          Export everything
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={15} />
          Import a backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Backup file to import"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (window.confirm('Importing replaces everything logged in this browser with the backup. Continue?')) void importFile(file);
            }
            e.target.value = '';
          }}
        />
      </div>
      {message && (
        <p role="status" className={'mt-3 text-sm ' + (message.tone === 'good' ? 'text-good-text' : 'text-critical-text')}>
          {message.text}
        </p>
      )}
      <p className="mt-2 text-xs text-ink-3">The GitHub token is never included in an export, so a backup is safe to commit.</p>

      <details className="mt-4 rounded-lg border border-critical/40 p-3">
        <summary className="text-sm font-medium text-critical-text">Reset everything</summary>
        <p className="mt-2 text-sm text-ink-2">
          Deletes every log, status, note, review and roadmap edit in this browser. The curriculum is untouched. Export first
          if there is anything to keep.
        </p>
        <label className="mt-2 block">
          <span className="label">Type RESET to confirm</span>
          <input className="input w-40" value={confirmReset} onChange={(e) => setConfirmReset(e.target.value)} />
        </label>
        <button
          type="button"
          className="btn btn-danger mt-2"
          disabled={confirmReset !== 'RESET'}
          onClick={() =>
            void resetAll().then(async () => {
              await db.settings.put(defaultSettings(seed.settings));
              setConfirmReset('');
              setMessage({ tone: 'good', text: 'Everything was reset.' });
            })
          }
        >
          Reset everything
        </button>
      </details>
    </Section>
  );
}

export function Settings() {
  const atlas = useAtlas();
  if (!atlas) {
    return (
      <Page title="Settings">
        <p className="text-sm text-ink-3">Loading…</p>
      </Page>
    );
  }
  return (
    <Page title="Settings" lead="Everything here starts from data/settings.yaml and is yours to change.">
      <Blocks settings={atlas.settings} />
      <HeatAndStreak settings={atlas.settings} />
      <Appearance settings={atlas.settings} />
      <Backup settings={atlas.settings} />
      <p className="num text-xs text-ink-3">Today is {todayDate()}.</p>
    </Page>
  );
}
