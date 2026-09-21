import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FilterSelect, SearchBox } from '../components/FilterSelect.tsx';
import { Icon } from '../components/Icon.tsx';
import { NotesEditor } from '../components/NotesEditor.tsx';
import { EmptyState, Page } from '../components/Page.tsx';
import { TrackDot } from '../components/TrackDot.tsx';
import { db } from '../db/db.ts';
import { setPaperStatus, usePaperStates } from '../db/state.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { today as todayDate } from '../lib/dates.ts';
import { cadenceStatus, nextPaper, sentenceCount } from '../lib/papers.ts';
import { buildIndex, search } from '../lib/search.ts';
import { PAPER_GROUPS } from '../seed/schema.ts';
import type { Paper } from '../seed/schema.ts';
import type { PaperState, PaperStatus } from '../db/types.ts';
import { useQueryParam } from '../router/router.tsx';

const STATUS_LABEL: Record<PaperStatus, string> = { queued: 'Queued', reading: 'Reading', read: 'Read', implemented: 'Implemented' };
const GROUP_LABEL: Record<string, string> = { classics: 'Classics', llm: 'The LLM era', systems: 'Systems', 'graphics-sim': 'Graphics and simulation' };

async function savePaperField(refId: string, key: 'summary' | 'keyIdea' | 'tryNext' | 'notes', value: string): Promise<void> {
  await db.transaction('rw', db.paperStates, async () => {
    const current: PaperState = (await db.paperStates.get(refId)) ?? { refId, status: 'queued' };
    const next = { ...current };
    if (value.trim()) next[key] = value;
    else delete next[key];
    await db.paperStates.put(next);
  });
}

function PaperCard({ paper, state, tracks }: { paper: Paper; state: PaperState | undefined; tracks: { id: string; name: string; slot: number; family: string; summary: string }[] }) {
  const [open, setOpen] = useState(false);
  const status = state?.status ?? 'queued';
  const track = tracks.find((t) => t.id === paper.tracks[0]);
  const summarySentences = state?.summary ? sentenceCount(state.summary) : 0;

  return (
    <li className="card">
      <div className="flex items-start gap-3 p-4">
        <span className="mt-1.5">
          <TrackDot track={track as never} />
        </span>
        <div className="min-w-0 flex-1">
          <button type="button" className="text-left font-medium leading-snug hover:text-accent-text" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {paper.title}
          </button>
          <p className="mt-0.5 text-xs text-ink-3">
            {paper.authors}
            {paper.year && ' · ' + paper.year}
            {' · ' + GROUP_LABEL[paper.group]}
          </p>
          {paper.note && <p className="mt-1 text-xs text-ink-2">{paper.note}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <select
            className="input h-7 w-auto px-1.5 text-xs"
            style={{ minHeight: '1.75rem' }}
            value={status}
            aria-label={'Status of ' + paper.title}
            onChange={(e) => void setPaperStatus(paper.id, e.target.value as PaperStatus)}
          >
            {(['queued', 'reading', 'read', 'implemented'] as const).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          {paper.url && (
            <a href={paper.url} target="_blank" rel="noreferrer noopener" className="btn btn-ghost btn-sm">
              <Icon name="external" size={13} />
              Read
            </a>
          )}
        </div>
      </div>
      {open && (
        <div className="grid gap-4 border-t border-line p-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <NotesEditor
              label={'Summary in three sentences' + (summarySentences ? ' (' + summarySentences + ' so far)' : '')}
              value={state?.summary}
              rows={3}
              placeholder="What problem, what idea, what result."
              onSave={(v) => void savePaperField(paper.id, 'summary', v)}
            />
          </div>
          <NotesEditor label="Key idea" value={state?.keyIdea} rows={3} placeholder="The one thing to remember." onSave={(v) => void savePaperField(paper.id, 'keyIdea', v)} />
          <NotesEditor label="What I would try" value={state?.tryNext} rows={3} placeholder="An experiment, a re-implementation, a figure to reproduce." onSave={(v) => void savePaperField(paper.id, 'tryNext', v)} />
        </div>
      )}
    </li>
  );
}

export function Papers() {
  const atlas = useAtlas();
  const states = usePaperStates();
  const [query, setQuery] = useQueryParam('q');
  const [status, setStatus] = useQueryParam('status');
  const [group, setGroup] = useQueryParam('group');
  const sources = useLiveQuery(async () => (atlas ? atlas.seed.paperSources : []), [atlas]);

  const index = useMemo(
    () => (atlas ? buildIndex(atlas.seed.papers.map((p) => ({ ...p, body: [p.authors ?? '', p.note ?? '', GROUP_LABEL[p.group] ?? '', String(p.year ?? '')].join(' ') }))) : []),
    [atlas],
  );

  if (!atlas || !states) {
    return (
      <Page title="Papers">
        <p className="text-sm text-ink-3">Loading…</p>
      </Page>
    );
  }

  const asOf = todayDate();
  const cadence = cadenceStatus(atlas.seed.phases, atlas.settings.core.paperCadence, states, asOf, atlas.settings.core.weekStartsOn);
  const next = nextPaper(atlas.seed.papers, states);
  const statusOf = (p: Paper): PaperStatus => states.get(p.id)?.status ?? 'queued';
  const results = search(index, query ?? '').filter((p) => (!status || statusOf(p) === status) && (!group || p.group === group));
  const counts = (s: PaperStatus): number => atlas.seed.papers.filter((p) => statusOf(p) === s).length;

  return (
    <Page title="Papers" lead="The reading queue: one paper a week from year 2, each with three sentences and an idea to try.">
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(['queued', 'reading', 'read', 'implemented'] as const).map((s) => (
          <button key={s} type="button" className={'card px-3 py-2.5 text-left hover:border-line-strong' + (status === s ? ' ring-1 ring-accent' : '')} onClick={() => setStatus(status === s ? null : s)} aria-pressed={status === s}>
            <div className="eyebrow">{STATUS_LABEL[s]}</div>
            <div className="num mt-0.5 text-lg font-semibold">{counts(s)}</div>
          </button>
        ))}
      </div>

      <section className="card mb-4 p-4">
        {cadence.active ? (
          <p className="text-sm">
            <span className="font-medium">Cadence:</span>{' '}
            <span className="num">
              {cadence.read} read of {cadence.expected} expected
            </span>
            {cadence.behindBy > 0 ? (
              <span className="text-warning-text"> · {cadence.behindBy} behind</span>
            ) : (
              <span className="text-good-text"> · on pace</span>
            )}
            {!cadence.readThisWeek && <span className="text-ink-3"> · nothing read this week yet</span>}
          </p>
        ) : (
          <p className="text-sm text-ink-2">
            The one-paper-a-week cadence starts with year {atlas.settings.core.paperCadence.fromYear}
            {cadence.startsOn && ' on ' + cadence.startsOn}. Reading before then is a head start.
          </p>
        )}
        {next && (
          <p className="mt-2 text-sm text-ink-2">
            <span className="text-ink-3">Next up:</span> <span className="font-medium text-ink">{next.title}</span>
          </p>
        )}
      </section>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_12rem_12rem]">
        <SearchBox value={query ?? ''} onChange={(v) => setQuery(v || null)} placeholder="Search titles and authors" />
        <FilterSelect label="Status" value={status ?? ''} onChange={(v) => setStatus(v || null)} options={(['queued', 'reading', 'read', 'implemented'] as const).map((s) => ({ value: s, label: STATUS_LABEL[s], count: counts(s) }))} />
        <FilterSelect label="Group" value={group ?? ''} onChange={(v) => setGroup(v || null)} options={PAPER_GROUPS.map((g) => ({ value: g, label: GROUP_LABEL[g] ?? g }))} />
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon="papers"
          title="Nothing matches"
          action={
            <button type="button" className="btn" onClick={() => [setQuery, setStatus, setGroup].forEach((set) => set(null))}>
              Clear filters
            </button>
          }
        >
          Try fewer words, or a different filter.
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {results.map((paper) => (
            <PaperCard key={paper.id} paper={paper} state={states.get(paper.id)} tracks={atlas.seed.tracks} />
          ))}
        </ul>
      )}

      {sources && sources.length > 0 && (
        <section className="card mt-6 p-4">
          <h2 className="mb-2 text-sm font-semibold">Where to find more</h2>
          <ul className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {sources.map((source) => (
              <li key={source.id} className="text-sm">
                {source.url ? (
                  <a href={source.url} target="_blank" rel="noreferrer noopener" className="text-accent-text hover:underline">
                    {source.title}
                  </a>
                ) : (
                  source.title
                )}
                {source.summary && <span className="block text-xs text-ink-3">{source.summary}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  );
}
