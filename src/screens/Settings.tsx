import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { importBackup, resetAll } from '../db/backup.ts';
import { db } from '../db/db.ts';
import { disconnectGithub } from '../db/github.ts';
import { defaultSettings, updateSettings } from '../db/settings.ts';
import { useMeta, writeMeta } from '../db/state.ts';
import type { StoredSettings } from '../db/types.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { NEW_REPO_URL, NEW_TOKEN_URL } from '../lib/github.ts';
import { SHORTCUTS_META_KEY } from '../lib/shortcuts.ts';
import { heatLabel } from '../lib/streaks.ts';
import { useOptimistic } from '../lib/useOptimistic.ts';
import { useQueryParam } from '../router/router.tsx';
import { seed } from '../seed/index.ts';
import { syncEngine } from '../sync/engine.ts';
import { statusText, tokenDaysLeft, useSyncView } from '../sync/status.ts';
import type { SettingsDefaults } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { Header } from '../ui/Header.tsx';
import { Icon } from '../ui/Icon.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import { TextField } from '../ui/TextField.tsx';
import { NumberField } from '../ui/NumberField.tsx';
import { Blocks, Schedule } from './settings/Schedule.tsx';
import { Appearance } from './settings/Appearance.tsx';
import { Layout } from './settings/Layout.tsx';
import { BlogSettings } from './settings/BlogSettings.tsx';
import { SleepSettings } from './settings/SleepSettings.tsx';
import { ProjectSettings } from './settings/ProjectSettings.tsx';
import { About } from './settings/About.tsx';
import { Problem, Section, saveCore } from './settings/shared.tsx';
import { exportBackup } from './parts/backupActions.ts';
import { ShortcutRows } from './Shortcuts.tsx';

function HeatAndStreak({ settings }: { settings: StoredSettings }) {
  const [problem, setProblem] = useState<string | null>(null);
  const [autoFreeze, setAutoFreeze] = useOptimistic(settings.core.streak.autoFreeze);
  const run = async (change: (core: SettingsDefaults) => SettingsDefaults): Promise<void> => setProblem(await saveCore(change));
  const t = settings.core.heatmapThresholds;
  return (
    <Section title="Heatmap and streak">
      <SegmentedControl
        label="Heatmap intensity"
        value={settings.core.heatmapMode}
        onChange={(mode: 'relative' | 'absolute') => void run((core) => ((core.heatmapMode = mode), core))}
        options={[
          { value: 'relative', label: 'Share of the day’s plan' },
          { value: 'absolute', label: 'Minutes' },
        ]}
      />
      <p className="mb-3 mt-2 text-meta text-ink2">
        {settings.core.heatmapMode === 'relative' ? 'A day lights up by how much of its plan it did: under 25 %, under 60 %, under 100 %, then all of it. Days that plan nothing use the minutes below.' : 'A day lights up by its minutes, at the levels below.'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {([0, 1, 2, 3] as const).map((i) => (
          <NumberField key={i} label={'Level ' + (i + 1) + ' from, min'} value={t[i]} min={1} max={1440} onCommit={(n) => void run((core) => ((core.heatmapThresholds[i] = n), core))} />
        ))}
      </div>
      <p className="mt-2 text-meta text-ink2">{([1, 2, 3, 4] as const).map((l) => 'Level ' + l + ': ' + heatLabel(l, t)).join(' · ')}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <NumberField label="A day counts from, min" value={settings.core.streak.minMinutes} min={1} max={1440} onCommit={(n) => void run((core) => ((core.streak.minMinutes = n), core))} />
        <NumberField label="Or from, % of its plan" value={settings.core.streak.percent} min={1} max={100} onCommit={(n) => void run((core) => ((core.streak.percent = n), core))} />
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
    <a href={href} target="_blank" rel="noreferrer noopener" className="flex min-h-11 items-center gap-2 text-button font-medium text-blue-deep">
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
  // Looked up when used, not at render: the engine starts a moment after the first screen draws.
  const engine = { get current() { return syncEngine(); } };

  const connect = async (): Promise<void> => {
    const sync = engine.current;
    if (!repo.trim() || !token.trim() || busy || !sync) return;
    setBusy(true);
    setMessage('Connecting…');
    const result = await sync.connect({ repo, token });
    setBusy(false);
    if (result.ok) {
      setToken('');
      setMessage(result.warning ?? 'Connected as @' + result.login + '. Your log and progress are in ' + repo.trim() + '.');
    } else setMessage(result.message + ' The token was not saved.');
  };

  const calendarRow = (
    <Row
      title="Show my GitHub calendar on Stats"
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
            onSave={(v) => void engine.current?.setAuthorEmail(v)}
          />
          <SavedField
            label="Token expires on"
            value={config.tokenExpiresAt ?? ''}
            hint="GitHub shows it on the token's page but does not tell the app. Atlas reminds you two weeks before. Write it like 2027-01-06."
            valid={(v) => /^\d{4}-\d{2}-\d{2}$/.test(v)}
            problem="Write the date like 2027-01-06."
            onSave={(v) => void engine.current?.setTokenExpiry(v || undefined)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void engine.current?.syncNow({ force: true })} aria-disabled={status.phase === 'syncing' || undefined}>
            Sync now
          </Button>
          <Button onClick={() => void engine.current?.disconnect().then(() => setMessage('Disconnected. Everything stays on this device and in the repository.'))}>Disconnect</Button>
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
  // Links such as "Add it in Settings" on Stats land on the right section.
  useEffect(() => {
    if (ready && section) document.getElementById(section)?.scrollIntoView({ block: 'start' });
  }, [ready, section]);

  return (
    <Screen title="Settings">
      <Header title="Settings" sub="Everything here starts from data/settings.yaml and is yours to change." />
      {atlas && (
        <div className="[&>section:first-child]:mt-6">
          <Schedule settings={atlas.settings} />
          <Blocks settings={atlas.settings} />
          <ProjectSettings settings={atlas.settings} />
          <BlogSettings />
          <SleepSettings />
          <HeatAndStreak settings={atlas.settings} />
          <Appearance settings={atlas.settings} />
          <Layout atlas={atlas} />
          {(atlas.seed.patchProblems ?? []).length > 0 && (
            <Section id="plan-edits" title="Plan edits that no longer apply">
              <RowList>
                {atlas.seed.patchProblems!.map((p) => (
                  <Row key={p} title={p} />
                ))}
              </RowList>
              <p className="mt-2 text-meta text-ink2">The curriculum changed under these edits. They are skipped, and kept in case the item comes back.</p>
            </Section>
          )}
          <Keyboard />
          <Backup settings={atlas.settings} />
          <Sync settings={atlas.settings} />
          <About />
        </div>
      )}
    </Screen>
  );
}
