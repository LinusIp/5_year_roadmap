import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { importBackup, resetAll } from '../db/backup.ts';
import { db } from '../db/db.ts';
import { checkGithub, connectGithub, disconnectGithub, useGithubConnected } from '../db/github.ts';
import { defaultSettings, updateSettings } from '../db/settings.ts';
import { useMeta, writeMeta } from '../db/state.ts';
import type { StoredSettings, Theme } from '../db/types.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { dayName } from '../lib/dates.ts';
import { NEW_TOKEN_URL } from '../lib/github.ts';
import { weeklyTargetMinutes } from '../lib/schedule.ts';
import { SHORTCUTS_META_KEY } from '../lib/shortcuts.ts';
import { heatLabel } from '../lib/streaks.ts';
import { useOptimistic } from '../lib/useOptimistic.ts';
import { useQueryParam } from '../router/router.tsx';
import { seed } from '../seed/index.ts';
import { SettingsDefaultsSchema } from '../seed/schema.ts';
import type { SettingsDefaults } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { Chips } from '../ui/Chips.tsx';
import { Header } from '../ui/Header.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import { Sheet } from '../ui/Sheet.tsx';
import { TextField } from '../ui/TextField.tsx';
import { exportBackup } from './parts/backupActions.ts';
import { PickerSheet } from './parts/PickerSheet.tsx';
import { blockShort, span } from './parts/text.ts';
import { ShortcutRows } from './Shortcuts.tsx';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Saves a change to the core settings only if the result still passes the schema of data/settings.yaml. */
async function saveCore(change: (core: SettingsDefaults) => SettingsDefaults): Promise<string | null> {
  let problem: string | null = null;
  await updateSettings(seed.settings, (current) => {
    const parsed = SettingsDefaultsSchema.safeParse(change(structuredClone(current.core)));
    if (!parsed.success) {
      problem = parsed.error.issues[0]?.message ?? 'That value is not allowed.';
      return current;
    }
    return { ...current, core: parsed.data };
  });
  return problem === 'must be strictly ascending' ? 'Each heatmap level must start above the one before it.' : problem;
}

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-8 scroll-mt-4">
      <h2 className="mb-1.5 text-meta font-normal text-ink2">{title}</h2>
      {children}
    </section>
  );
}

function Problem({ text }: { text: string | null }) {
  return text ? (
    <p role="alert" className="mt-2 text-meta font-medium text-ink">
      {text}
    </p>
  ) : null;
}

/** A whole number, saved on blur when it is within range. */
function NumberField({ label, value, min, max, hint, onCommit }: { label: string; value: number; min: number; max: number; hint?: string; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const n = Number(draft);
  const bad = draft !== null && !(draft.trim() !== '' && Number.isFinite(n) && n >= min && n <= max);
  return (
    <TextField
      label={label}
      type="numeric"
      value={draft ?? String(value)}
      onChange={setDraft}
      hint={hint}
      error={bad ? 'Enter a number from ' + min + ' to ' + max + '.' : null}
      onBlur={() => {
        if (draft === null || bad) return;
        onCommit(Math.round(n));
        setDraft(null);
      }}
    />
  );
}

/** "every day", "Mon to Fri", or the days by name. */
function describeDays(days: number[]): string {
  if (days.length === 7) return 'every day';
  if (days.join() === '1,2,3,4,5') return 'Mon to Fri';
  if (days.length === 0) return 'no days';
  return days.map((d) => DAY_SHORT[d]).join(', ');
}

function BlockSheet({ settings, index, onClose }: { settings: StoredSettings; index: number | null; onClose: () => void }) {
  const block = index !== null ? settings.core.blocks[index] : undefined;
  const [name, setName] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const run = async (change: (core: SettingsDefaults) => SettingsDefaults): Promise<void> => setProblem(await saveCore(change));
  const close = (): void => {
    setName(null);
    setProblem(null);
    onClose();
  };
  return (
    <Sheet open={block !== undefined} title={block ? 'Block ' + block.id : ''} onClose={close}>
      {block && index !== null && (
        <div className="space-y-4">
          <TextField
            label="Name"
            value={name ?? block.name}
            onChange={setName}
            onBlur={() => {
              const next = (name ?? '').trim();
              if (next && next !== block.name) void run((core) => ((core.blocks[index]!.name = next), core));
              setName(null);
            }}
          />
          <NumberField label="Minutes a day" value={block.minutes} min={0} max={720} onCommit={(n) => void run((core) => ((core.blocks[index]!.minutes = n), core))} />
          <Chips
            label="Days"
            items={DAY_SHORT.map((day, d) => {
              const on = block.days.includes(d);
              return {
                key: day,
                label: day,
                pressed: on,
                onClick: () =>
                  void run((core) => {
                    const days = core.blocks[index]!.days;
                    core.blocks[index]!.days = on ? days.filter((x) => x !== d) : [...days, d].sort();
                    return core;
                  }),
              };
            })}
          />
          <Problem text={problem} />
        </div>
      )}
    </Sheet>
  );
}

function Blocks({ settings }: { settings: StoredSettings }) {
  const [open, setOpen] = useState<number | null>(null);
  const [pickingDay, setPickingDay] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const weekly = weeklyTargetMinutes(settings);
  return (
    <Section title={'Blocks · about ' + span(weekly / 7) + ' a day, ' + span(weekly) + ' a week'}>
      <RowList>
        {settings.core.blocks.map((block, index) => (
          <Row key={block.id} title={'Block ' + block.id + ' · ' + blockShort(block.name)} meta={span(block.minutes) + ' · ' + describeDays(block.days)} onClick={() => setOpen(index)} />
        ))}
        <Row title="Weekly review" trailing={dayName(DATE_OF_DAY[settings.core.review.day]!)} onClick={() => setPickingDay(true)} />
      </RowList>
      <div className="mt-3">
        <SegmentedControl
          label="Week starts on"
          value={String(settings.core.weekStartsOn)}
          onChange={(v) => void saveCore((core) => ((core.weekStartsOn = Number(v) as 0 | 1), core)).then(setProblem)}
          options={[
            { value: '1', label: 'Week starts Monday' },
            { value: '0', label: 'Week starts Sunday' },
          ]}
        />
      </div>
      <Problem text={problem} />
      <BlockSheet settings={settings} index={open} onClose={() => setOpen(null)} />
      <PickerSheet
        open={pickingDay}
        title="Weekly review"
        value={String(settings.core.review.day)}
        options={DAY_SHORT.map((_, d) => ({ value: String(d), label: dayName(DATE_OF_DAY[d]!) }))}
        onPick={(v) => v && void saveCore((core) => ((core.review.day = Number(v)), core)).then(setProblem)}
        onClose={() => setPickingDay(false)}
      />
    </Section>
  );
}

/** A date for each weekday (4 to 10 January 2026 run Sunday to Saturday), to name days with dayName. */
const DATE_OF_DAY = ['2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10'];

function HeatAndStreak({ settings }: { settings: StoredSettings }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [autoFreeze, setAutoFreeze] = useOptimistic(settings.core.streak.autoFreeze);
  const run = async (change: (core: SettingsDefaults) => SettingsDefaults): Promise<void> => setProblem(await saveCore(change));
  const t = settings.core.heatmapThresholds;
  return (
    <Section title="Heatmap and streak">
      <div className="grid grid-cols-2 gap-3">
        {([0, 1, 2, 3] as const).map((i) => (
          <NumberField key={i} label={'Level ' + (i + 1) + ' from, min'} value={t[i]} min={1} max={1440} onCommit={(n) => void run((core) => ((core.heatmapThresholds[i] = n), core))} />
        ))}
      </div>
      <p className="mt-2 text-meta text-ink2">{([1, 2, 3, 4] as const).map((l) => 'Level ' + l + ': ' + heatLabel(l, t)).join(' · ')}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <NumberField label="A day counts from, min" value={settings.core.streak.minMinutes} min={1} max={1440} onCommit={(n) => void run((core) => ((core.streak.minMinutes = n), core))} />
        <NumberField label="Freeze days a month" value={settings.core.streak.freezesPerMonth} min={0} max={31} onCommit={(n) => void run((core) => ((core.streak.freezesPerMonth = n), core))} />
      </div>
      <RowList flat className="mt-3">
        <Row
          title="Spend freezes automatically"
          meta="A missed day uses a freeze instead of ending the streak"
          toggle={{
            on: autoFreeze,
            onChange: (on) => {
              setAutoFreeze(on);
              void run((core) => ((core.streak.autoFreeze = on), core));
            },
          }}
        />
      </RowList>
      <Problem text={problem} />
    </Section>
  );
}

function Appearance({ settings }: { settings: StoredSettings }) {
  return (
    <Section title="Theme">
      <SegmentedControl
        label="Theme"
        value={settings.theme}
        onChange={(theme: Theme) => void updateSettings(seed.settings, (s) => ({ ...s, theme }))}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'system', label: 'Follow the system' },
        ]}
      />
    </Section>
  );
}

function Keyboard() {
  const stored = useMeta<boolean>(SHORTCUTS_META_KEY, true);
  const [enabled, setEnabled] = useOptimistic(stored !== false);
  return (
    <Section id="keyboard" title="Keyboard">
      <RowList>
        <Row
          title="Use single-key shortcuts"
          meta="Off if you use speech input, or anything that might press a letter by accident"
          toggle={{
            on: enabled,
            disabled: stored === undefined,
            onChange: (on) => {
              setEnabled(on);
              void writeMeta(SHORTCUTS_META_KEY, on);
            },
          }}
        />
      </RowList>
      {enabled && (
        <div className="mt-3">
          <ShortcutRows />
        </div>
      )}
    </Section>
  );
}

function Backup({ settings }: { settings: StoredSettings }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [confirmReset, setConfirmReset] = useState('');
  const counts = useLiveQuery(async () => ({ logs: await db.dayLogs.count(), states: await db.itemStates.count() }), []);

  const restore = async (file: File): Promise<void> => {
    setPending(null);
    const result = await importBackup(await file.text());
    if (result.ok) setMessage('Restored ' + Object.values(result.counts).reduce((a, b) => a + b, 0) + ' records from ' + file.name + '.');
    else setMessage('Nothing was changed. ' + result.errors.join(' '));
  };

  return (
    <Section id="backup" title="Export and import">
      <p className="text-meta text-ink2">
        {counts ? counts.logs + ' days logged, ' + counts.states + ' items with progress · ' : ''}
        {settings.backup.lastBackupAt ? 'last exported ' + settings.backup.lastBackupAt : 'never exported'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => void exportBackup().then((name) => setMessage('Saved ' + name + '. Keep it somewhere that is not this browser.'))}>Export everything</Button>
        <Button onClick={() => fileRef.current?.click()}>Import a file</Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Backup file to import"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPending(file);
            e.target.value = '';
          }}
        />
      </div>
      {pending && (
        <div className="mt-3">
          <p className="text-body">Replace everything in this browser with {pending.name}?</p>
          <div className="mt-2 flex gap-2">
            <Button onClick={() => void restore(pending)}>Replace</Button>
            <Button variant="icon" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {message && (
        <p role="status" className="mt-3 text-meta text-ink">
          {message}
        </p>
      )}
      <p className="mt-2 text-meta text-ink2">The GitHub token is never part of an export.</p>

      <div className="mt-6">
        <p className="text-body">Reset everything</p>
        <p className="mt-1 text-meta text-ink2">Deletes every log, status, note, review and plan edit in this browser. The curriculum is untouched.</p>
        <div className="mt-3 flex flex-wrap items-start gap-2">
          <TextField label="Type RESET to confirm" value={confirmReset} onChange={setConfirmReset} className="w-56" />
          <Button
            aria-disabled={confirmReset !== 'RESET' || undefined}
            onClick={() => {
              if (confirmReset !== 'RESET') return;
              void resetAll().then(async () => {
                // The token survives a reset, so the settings that go with it do too.
                await db.settings.put({ ...defaultSettings(seed.settings), github: settings.github });
                setConfirmReset('');
                setMessage('Everything was reset.');
              });
            }}
          >
            Reset everything
          </Button>
        </div>
      </div>
    </Section>
  );
}

function GitHub({ settings }: { settings: StoredSettings }) {
  const connected = useGithubConnected();
  const [showCalendar, setShowCalendar] = useOptimistic(settings.github.showCalendar);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const connect = async (): Promise<void> => {
    if (!token.trim() || busy) return;
    setBusy(true);
    const result = await connectGithub(seed.settings, token);
    setBusy(false);
    if (result.ok) {
      setToken('');
      setMessage('Your GitHub calendar is now on Activity.');
    } else setMessage(result.message + ' The token was not saved.');
  };
  const check = async (): Promise<void> => {
    setBusy(true);
    const result = await checkGithub(seed.settings);
    setBusy(false);
    setMessage(result.ok ? 'GitHub knows this token as @' + result.value.login + '.' : result.message);
  };

  return (
    <Section id="github" title="GitHub">
      {connected === undefined ? null : connected ? (
        <>
          <RowList>
            <Row
              title="Show my GitHub calendar on Activity"
              meta={settings.github.username ? 'Connected as @' + settings.github.username : 'Connected'}
              toggle={{
                on: showCalendar,
                onChange: (on) => {
                  setShowCalendar(on);
                  void updateSettings(seed.settings, (s) => ({ ...s, github: { ...s.github, showCalendar: on } }));
                },
              }}
            />
          </RowList>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => void check()} aria-disabled={busy || undefined}>
              {busy ? 'Checking' : 'Test the connection'}
            </Button>
            <Button onClick={() => void disconnectGithub(seed.settings).then(() => setMessage('The token was removed from this browser.'))}>Remove the token</Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void connect();
          }}
        >
          <p className="mb-3 text-meta text-ink2">
            Optional. Shows your real GitHub contribution calendar under the heatmap on Activity.{' '}
            <a href={NEW_TOKEN_URL} target="_blank" rel="noreferrer noopener" className="text-accent">
              Create a fine-grained token
            </a>{' '}
            with every permission off: reading your calendar needs none.
          </p>
          <TextField label="Personal access token" type="password" autoComplete="off" value={token} onChange={setToken} />
          <Button className="mt-3" aria-disabled={!token.trim() || busy || undefined} onClick={() => void connect()}>
            {busy ? 'Checking' : 'Connect'}
          </Button>
        </form>
      )}
      {message && (
        <p role="status" className="mt-3 text-meta text-ink">
          {message}
        </p>
      )}
      <p className="mt-3 text-meta text-ink2">The token stays in this browser&apos;s IndexedDB. It is never exported, and it is sent to api.github.com and nowhere else.</p>
    </Section>
  );
}

/** Settings: everything starts from data/settings.yaml and is the user's to change. */
export function Settings() {
  const atlas = useAtlas();
  const [section] = useQueryParam('section');
  const ready = atlas !== undefined;
  // Links such as "Add it in Settings" on Activity land on the right section.
  useEffect(() => {
    if (ready && section) document.getElementById(section)?.scrollIntoView({ block: 'start' });
  }, [ready, section]);

  return (
    <Screen title="Settings">
      <Header title="Settings" sub="Everything here starts from data/settings.yaml and is yours to change." />
      {atlas && (
        <div className="[&>section:first-child]:mt-0">
          <Blocks settings={atlas.settings} />
          <HeatAndStreak settings={atlas.settings} />
          <Appearance settings={atlas.settings} />
          <Keyboard />
          <Backup settings={atlas.settings} />
          <GitHub settings={atlas.settings} />
        </div>
      )}
    </Screen>
  );
}
