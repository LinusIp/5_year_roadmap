import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { importBackup, resetAll } from '../db/backup.ts';
import { db } from '../db/db.ts';
import { disconnectGithub } from '../db/github.ts';
import { defaultSettings, updateSettings } from '../db/settings.ts';
import { useMeta, writeMeta } from '../db/state.ts';
import type { StoredSettings, Theme } from '../db/types.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { dayName } from '../lib/dates.ts';
import { NEW_REPO_URL, NEW_TOKEN_URL } from '../lib/github.ts';
import { weeklyTargetMinutes } from '../lib/schedule.ts';
import { SHORTCUTS_META_KEY } from '../lib/shortcuts.ts';
import { heatLabel } from '../lib/streaks.ts';
import { useOptimistic } from '../lib/useOptimistic.ts';
import { useQueryParam } from '../router/router.tsx';
import { seed } from '../seed/index.ts';
import { SettingsDefaultsSchema } from '../seed/schema.ts';
import { syncEngine } from '../sync/engine.ts';
import { statusText, tokenDaysLeft, useSyncView } from '../sync/status.ts';
import type { SettingsDefaults } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { Chips } from '../ui/Chips.tsx';
import { Header } from '../ui/Header.tsx';
import { Icon } from '../ui/Icon.tsx';
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
        <p className="mt-1 text-meta text-ink2">Deletes every log, status, note, review and plan edit in this browser. The curriculum is untouched. With Sync on, nothing is deleted on GitHub, and the next sync brings it all back.</p>
        <div className="mt-3 flex flex-wrap items-start gap-2">
          <TextField label="Type RESET to confirm" value={confirmReset} onChange={setConfirmReset} className="w-56" />
          <Button
            aria-disabled={confirmReset !== 'RESET' || undefined}
            onClick={() => {
              if (confirmReset !== 'RESET') return;
              void resetAll().then(async () => {
                const sync = syncEngine();
                if (sync && (await sync.config())) {
                  // With Sync on, the next pull brings the repository's state back, settings included.
                  void sync.syncNow({ force: true });
                } else {
                  // The token survives a reset, so the settings that go with it do too.
                  await db.settings.put({ ...defaultSettings(seed.settings), github: settings.github });
                }
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

/** The link to a step of the setup, as a 44 px target of its own. */
function StepLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="flex min-h-11 items-center gap-2 text-button font-medium text-accent">
      <Icon name="external" size={16} />
      {children}
    </a>
  );
}

/** A text field saved on blur, for the commit email and the token's expiry. */
function SavedField({ label, value, hint, valid, problem, onSave }: { label: string; value: string; hint: string; valid: (v: string) => boolean; problem: string; onSave: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;
  const bad = draft !== null && text.trim() !== '' && !valid(text.trim());
  return (
    <TextField
      label={label}
      value={text}
      onChange={setDraft}
      hint={hint}
      error={bad ? problem : null}
      onBlur={() => {
        if (draft === null || bad) return;
        if (draft.trim() !== value) onSave(draft.trim());
        setDraft(null);
      }}
    />
  );
}

/**
 * Sync (brief 4.10): a private GitHub repository as the source of truth. Off, it shows the steps and the two
 * fields it needs, and says once that nothing is backed up. On, one phrase says how sync stands.
 */
function Sync({ settings }: { settings: StoredSettings }) {
  const view = useSyncView();
  const [showCalendar, setShowCalendar] = useOptimistic(settings.github.showCalendar);
  const [repo, setRepo] = useState(settings.github.username ? settings.github.username + '/atlas-data' : '');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!view) return <Section id="sync" title="Sync" children={null} />;
  const engine = syncEngine();

  const connect = async (): Promise<void> => {
    if (!repo.trim() || !token.trim() || busy || !engine) return;
    setBusy(true);
    setMessage('Connecting…');
    const result = await engine.connect({ repo, token });
    setBusy(false);
    if (result.ok) {
      setToken('');
      setMessage(result.warning ?? 'Connected as @' + result.login + '. Your log and progress are in ' + repo.trim() + '.');
    } else setMessage(result.message + ' The token was not saved.');
  };

  const calendarRow = (
    <Row
      title="Show my GitHub calendar on Activity"
      meta={settings.github.username ? 'As @' + settings.github.username : 'From your GitHub account'}
      toggle={{
        on: showCalendar,
        onChange: (on) => {
          setShowCalendar(on);
          void updateSettings(seed.settings, (s) => ({ ...s, github: { ...s.github, showCalendar: on } }));
        },
      }}
    />
  );

  if (view.connected && view.config) {
    const { config, status } = view;
    const days = tokenDaysLeft(config);
    const problems = Object.entries(status.problems ?? {});
    return (
      <Section id="sync" title="Sync">
        <p role="status" className="text-body">
          {statusText(view, now)}
        </p>
        {days !== null && days <= 14 && (
          <p className="mt-1 text-meta text-ink">{days < 0 ? 'The token expired on ' + config.tokenExpiresAt + '.' : 'The token expires in ' + days + (days === 1 ? ' day' : ' days') + '. Create a new one and reconnect.'}</p>
        )}
        <RowList className="mt-3">
          <Row
            title={config.owner + '/' + config.repo}
            meta={(config.private ? 'Private' : 'Public: make it private on GitHub') + ' · commits as ' + config.authorEmail}
            href={'https://github.com/' + config.owner + '/' + config.repo}
          />
          {calendarRow}
        </RowList>
        {problems.length > 0 && (
          <RowList label="Files Atlas could not read" className="mt-4">
            {problems.map(([path, why]) => (
              <Row key={path} title={path} meta={why} href={'https://github.com/' + config.owner + '/' + config.repo + '/blob/' + config.branch + '/' + path} />
            ))}
          </RowList>
        )}
        <div className="mt-4 space-y-3">
          <SavedField
            label="Commit email"
            value={config.authorEmail}
            hint="GitHub counts a commit on your graph when its email is on your account. The no-reply address always is."
            valid={(v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
            problem="That does not look like an email address."
            onSave={(v) => void engine?.setAuthorEmail(v)}
          />
          <SavedField
            label="Token expires on"
            value={config.tokenExpiresAt ?? ''}
            hint="Atlas reminds you two weeks before. Write it like 2027-01-06."
            valid={(v) => /^\d{4}-\d{2}-\d{2}$/.test(v)}
            problem="Write the date like 2027-01-06."
            onSave={(v) => void engine?.setTokenExpiry(v || undefined)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void engine?.syncNow({ force: true })} aria-disabled={status.phase === 'syncing' || undefined}>
            Sync now
          </Button>
          <Button onClick={() => void engine?.disconnect().then(() => setMessage('Disconnected. Everything stays on this device and in the repository.'))}>Disconnect</Button>
        </div>
        {message && <p className="mt-3 text-meta text-ink">{message}</p>}
        <p className="mt-3 text-meta text-ink2">
          The token stays in this browser&apos;s IndexedDB, never in an export or the repository, and goes to api.github.com only. Anyone who can use this device can read it, so give it this one repository and 90 days.
        </p>
      </Section>
    );
  }

  return (
    <Section id="sync" title="Sync">
      <p role="status" className="text-body">
        Not backed up
      </p>
      <p className="mt-1 text-meta text-ink2">
        Everything lives in this browser only. Sync keeps it in a private GitHub repository you own: safe from a cleared browser, the same on every device, and each study session a commit on your contribution graph.
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-meta text-ink2">
        <li>
          Create a private repository named atlas-data.
          <StepLink href={NEW_REPO_URL}>New repository</StepLink>
        </li>
        <li>
          Create a fine-grained token: only that repository, Contents: read and write, 90 days.
          <StepLink href={NEW_TOKEN_URL}>Create a fine-grained token</StepLink>
        </li>
        <li>Paste both here and connect. The first sync writes the layout and a README.</li>
      </ol>
      <form
        className="mt-3 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void connect();
        }}
      >
        <TextField label="Repository" hint="Owner and name, like your-name/atlas-data." value={repo} onChange={setRepo} autoComplete="off" />
        <TextField label="Personal access token" type="password" autoComplete="off" value={token} onChange={setToken} />
        <Button aria-disabled={!repo.trim() || !token.trim() || busy || undefined} onClick={() => void connect()}>
          {busy ? 'Connecting' : 'Connect'}
        </Button>
      </form>
      {message && (
        <p role="alert" className="mt-3 text-meta text-ink">
          {message}
        </p>
      )}
      {view.calendarOnly && (
        <>
          <RowList className="mt-4" label="GitHub calendar">
            {calendarRow}
          </RowList>
          <Button className="mt-3" onClick={() => void disconnectGithub(seed.settings).then(() => setMessage('The token was removed from this browser.'))}>
            Remove the calendar token
          </Button>
        </>
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
        <div className="[&>section:first-child]:mt-6">
          <Blocks settings={atlas.settings} />
          <HeatAndStreak settings={atlas.settings} />
          <Appearance settings={atlas.settings} />
          <Keyboard />
          <Backup settings={atlas.settings} />
          <Sync settings={atlas.settings} />
        </div>
      )}
    </Screen>
  );
}
