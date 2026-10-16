import { useMemo, useState } from 'react';
import { db } from '../db/db.ts';
import { editItemState, useItemState } from '../db/state.ts';
import type { ChallengeEvent } from '../db/types.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { useCatalogue, useCatalogueIndex, useChallengeEvents } from '../hooks/useCatalogue.ts';
import { LANGUAGES, dailyChallenge, eventId, languageOf, languagesUsed } from '../lib/catalogue/daily.ts';
import { groupLabel } from '../lib/catalogue/filters.ts';
import { formatLong, today as todayDate } from '../lib/dates.ts';
import { planForDay } from '../lib/schedule.ts';
import { navigate, useQueryParam } from '../router/router.tsx';
import type { Challenge as ChallengeItem } from '../seed/catalogue.ts';
import { Button } from '../ui/Button.tsx';
import { Header } from '../ui/Header.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import { LinkField } from './parts/ItemSheet.tsx';
import { NotesField } from './parts/NotesField.tsx';

async function logEvent(event: Omit<ChallengeEvent, 'id'>): Promise<void> {
  const existing = await db.challenges.where('date').equals(event.date).toArray();
  await db.challenges.put({ ...event, id: eventId(event.date, event.event, event.challengeId, existing) });
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      <h2 className="section-label">{title}</h2>
      {children}
    </section>
  );
}

function Body({ challenge, events, isDaily, language, setLanguage }: { challenge: ChallengeItem; events: ChallengeEvent[]; isDaily: boolean; language: string; setLanguage: (l: string) => void }) {
  const state = useItemState(challenge.id);
  const [hints, setHints] = useState(0);
  const [approach, setApproach] = useState(false);
  const date = todayDate();
  const solvedToday = events.some((e) => e.challengeId === challenge.id && e.event === 'solved' && e.date === date);
  const history = events.filter((e) => e.challengeId === challenge.id && e.event === 'solved').sort((a, b) => a.date.localeCompare(b.date));
  // A challenge's solution link lives in `demoUrl`, so items.json stays readable by devices on an older Atlas.
  const setField = (key: 'notes' | 'demoUrl', value: string): void =>
    void editItemState(challenge.id, (s) => {
      const next = { ...s };
      if (value.trim()) next[key] = value;
      else delete next[key];
      return next;
    });

  const solve = async (): Promise<void> => {
    await logEvent({ challengeId: challenge.id, date, event: 'solved', language, ...(isDaily ? { daily: true } : {}) });
    if (!state || state.status !== 'done') await editItemState(challenge.id, (s) => ({ ...s, status: 'done', doneAt: s.doneAt ?? date }));
  };

  return (
    <div className="mt-6 flex flex-col gap-6">
      <p className="doc-text whitespace-pre-line text-body">{challenge.statement}</p>
      <Block title="Input">
        <p className="doc-text text-body">{challenge.input}</p>
      </Block>
      <Block title="Output">
        <p className="doc-text text-body">{challenge.output}</p>
      </Block>
      <Block title="Constraints">
        <p className="doc-block">{challenge.constraints}</p>
      </Block>
      <Block title={challenge.examples.length === 1 ? 'Example' : 'Examples'}>
        <div className="flex flex-col gap-3">
          {challenge.examples.map((ex, i) => (
            <figure key={i} className="tile p-[18px]">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="section-label">Input</p>
                  <pre className="doc-block">{ex.in}</pre>
                </div>
                <div>
                  <p className="section-label">Output</p>
                  <pre className="doc-block">{ex.out}</pre>
                </div>
              </div>
              {ex.why && <figcaption className="doc-text mt-3 text-meta text-ink2">{ex.why}</figcaption>}
            </figure>
          ))}
        </div>
      </Block>

      {hints > 0 && (
        <ol className="flex flex-col gap-2" aria-label="Hints">
          {challenge.hints.slice(0, hints).map((h, i) => (
            <li key={i} className="doc-text knob rounded-knob p-4 text-body">
              <span className="text-meta text-ink2">Hint {i + 1}. </span>
              {h}
            </li>
          ))}
        </ol>
      )}
      {approach && (
        <section aria-label="Approach" className="tile p-[18px]">
          <h2 className="section-label">Approach</h2>
          <p className="doc-text text-body">{challenge.approach}</p>
          <h2 className="section-label mt-6">Complexity</h2>
          <p className="doc-block">{challenge.complexity}</p>
          {challenge.edgeCases.length > 0 && (
            <>
              <h2 className="section-label mt-6">Edge cases to test</h2>
              <ul className="doc-text list-disc space-y-1 pl-5 text-body">
                {challenge.edgeCases.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {hints < challenge.hints.length && <Button icon="hint" onClick={() => setHints((n) => n + 1)}>{hints === 0 ? 'Hint' : 'Another hint'}</Button>}
        {!approach && <Button onClick={() => setApproach(true)}>Show approach</Button>}
      </div>

      <SegmentedControl label="Language" value={language as (typeof LANGUAGES)[number]} options={LANGUAGES.map((l) => ({ value: l, label: l }))} onChange={setLanguage} />

      <div className="flex flex-col gap-3">
        <NotesField label="Notes" value={state?.notes} onSave={(v) => setField('notes', v)} />
        <LinkField label="Link to your solution" value={state?.demoUrl} onSave={(v) => setField('demoUrl', v)} />
      </div>

      <div>
        {solvedToday ? (
          <p className="text-body font-medium" role="status">
            Solved today in {history.at(-1)?.language ?? language}.
          </p>
        ) : (
          <Button variant="filled" icon="check" onClick={() => void solve()}>
            Mark solved
          </Button>
        )}
      </div>

      {history.length > 0 && (
        <RowList label="Solved">
          {history.map((e) => (
            <Row key={e.id} title={formatLong(e.date)} meta={e.language ?? undefined} />
          ))}
        </RowList>
      )}
    </div>
  );
}

/**
 * A catalogue challenge: statement, input and output, constraints and examples; hints one at a time; the approach
 * and complexity on request; notes, a link to the solution, and Mark solved (the screen's one filled button). Opened
 * as the day's challenge (`?daily=1`) it also offers Skip (three a day) and Not today.
 */
export function Challenge({ id }: { id: string }) {
  const atlas = useAtlas();
  const items = useCatalogue();
  const entries = useCatalogueIndex();
  const events = useChallengeEvents();
  const [dailyParam] = useQueryParam('daily');
  const [chosenLanguage, setLanguage] = useState<string | null>(null);
  const date = todayDate();
  const challenge = useMemo(() => items?.find((i): i is ChallengeItem => i.id === id && i.kind === 'challenge'), [items, id]);

  const blockLanguage = useMemo(() => {
    if (!atlas) return undefined;
    const b = planForDay({ date, settings: atlas.settings, ctx: { seed: atlas.seed, states: atlas.states } }).blocks.find((x) => x.id === 'B')?.item;
    return languageOf(b ? b.refId + ' ' + b.title : undefined);
  }, [atlas, date]);
  const pick = entries && events ? dailyChallenge({ entries, events, date, blockLanguage }) : null;
  const isDaily = dailyParam === '1' && pick?.challenge.id === id;

  const close = (
    <Button variant="icon" to={isDaily ? '/' : '/library'}>
      Close
    </Button>
  );
  if (!items || !events || !entries) {
    return (
      <Screen title="Challenge">
        <Header title="Challenge" actions={close} />
        <p className="pt-6 text-meta text-ink2" role="status">
          Loading the challenge…
        </p>
      </Screen>
    );
  }
  if (!challenge) {
    return (
      <Screen title="Challenge">
        <Header title="Not in the catalogue" actions={close} />
        <p className="mt-6 text-body text-ink2">It may have been renamed or removed. Your notes on it are kept under the old id.</p>
      </Screen>
    );
  }

  const used = languagesUsed(events, challenge.id);
  const language = chosenLanguage ?? (isDaily && pick ? pick.language : (blockLanguage ?? 'Python'));
  const skip = async (): Promise<void> => {
    await logEvent({ challengeId: challenge.id, date, event: 'skipped', daily: true });
    const next = dailyChallenge({ entries, events: [...events, { id: 'pending', challengeId: challenge.id, date, event: 'skipped', daily: true }], date, blockLanguage });
    navigate(next ? '/challenge/' + next.challenge.id + '?daily=1' : '/', { replace: true });
  };
  const notToday = async (): Promise<void> => {
    await logEvent({ challengeId: challenge.id, date, event: 'hidden', daily: true });
    navigate('/');
  };

  const sub = [
    isDaily ? 'Daily challenge' : null,
    challenge.difficulty,
    challenge.estMinutes + ' min',
    groupLabel(challenge.topic),
    isDaily && pick?.anotherLanguage ? 'solve it in another language' : null,
    used.length > 0 ? 'solved in ' + used.join(', ') : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Screen title={challenge.title}>
      <Header title={challenge.title} sub={sub} actions={close} />
      {isDaily && pick && !pick.solved && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {pick.skipsLeft > 0 && (
            <Button size="sm" onClick={() => void skip()}>
              Skip · {pick.skipsLeft} left
            </Button>
          )}
          <Button size="sm" variant="icon" onClick={() => void notToday()}>
            Not today
          </Button>
        </div>
      )}
      <Body key={challenge.id} challenge={challenge} events={events} isDaily={isDaily} language={language} setLanguage={setLanguage} />
    </Screen>
  );
}
