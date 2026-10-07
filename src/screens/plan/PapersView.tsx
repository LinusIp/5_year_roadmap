import { useState } from 'react';
import { db } from '../../db/db.ts';
import { setPaperStatus } from '../../db/state.ts';
import type { PaperState, PaperStatus } from '../../db/types.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { today } from '../../lib/dates.ts';
import { cadenceStatus, nextPaper, sentenceCount } from '../../lib/papers.ts';
import { useQueryParam } from '../../router/router.tsx';
import type { Paper } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Chips } from '../../ui/Chips.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { StatusPill } from '../parts/StatusPill.tsx';
import { longDate } from '../parts/text.ts';

export const PAPER_STATUSES: { value: PaperStatus; label: string }[] = [
  { value: 'queued', label: 'Queued' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
  { value: 'implemented', label: 'Implemented' },
];
const GROUP_LABEL: Record<string, string> = { classics: 'Classics', llm: 'The LLM era', systems: 'Systems', 'graphics-sim': 'Graphics and simulation' };

async function savePaperField(refId: string, key: 'summary' | 'keyIdea' | 'tryNext', value: string): Promise<void> {
  await db.transaction('rw', db.paperStates, async () => {
    const current: PaperState = (await db.paperStates.get(refId)) ?? { refId, status: 'queued' };
    const next = { ...current };
    if (value.trim()) next[key] = value;
    else delete next[key];
    await db.paperStates.put(next);
  });
}

/** A text field over one paper note, saved when it loses focus. */
function PaperField({ paper, field, label, value, hint }: { paper: Paper; field: 'summary' | 'keyIdea' | 'tryNext'; label: string; value: string | undefined; hint?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <TextField
      label={label}
      multiline
      rows={3}
      value={draft ?? value ?? ''}
      onChange={setDraft}
      hint={hint}
      onBlur={() => {
        if (draft === null) return;
        void savePaperField(paper.id, field, draft);
        setDraft(null);
      }}
    />
  );
}

export function PaperStatusPill({ paper, status }: { paper: Paper; status: PaperStatus }) {
  return <StatusPill label={'Status of ' + paper.title} value={status} options={PAPER_STATUSES} onChange={(s) => void setPaperStatus(paper.id, s)} done="implemented" />;
}

/** A paper's link, status and the three notes the reading cadence asks for. */
export function PaperSheet({ paper, state, onClose }: { paper: Paper | null; state: PaperState | undefined; onClose: () => void }) {
  const sentences = state?.summary ? sentenceCount(state.summary) : 0;
  return (
    <Sheet open={paper !== null} title={paper?.title ?? ''} onClose={onClose}>
      {paper && (
        <div key={paper.id} className="space-y-5">
          <div>
            <p className="text-meta text-ink2">{[paper.authors, paper.year, GROUP_LABEL[paper.group]].filter(Boolean).join(' · ')}</p>
            {paper.note && <p className="mt-2 text-body text-ink2">{paper.note}</p>}
            <div className="mt-4 flex items-center gap-2">
              {paper.url && (
                <Button href={paper.url} icon="external">
                  Read
                </Button>
              )}
              <span className="ml-auto">
                <PaperStatusPill paper={paper} status={state?.status ?? 'queued'} />
              </span>
            </div>
          </div>
          <PaperField paper={paper} field="summary" label="Summary in three sentences" value={state?.summary} hint={sentences ? sentences + ' so far. What problem, what idea, what result.' : 'What problem, what idea, what result.'} />
          <PaperField paper={paper} field="keyIdea" label="Key idea" value={state?.keyIdea} hint="The one thing to remember." />
          <PaperField paper={paper} field="tryNext" label="What I would try" value={state?.tryNext} hint="An experiment, a re-implementation, a figure to reproduce." />
        </div>
      )}
    </Sheet>
  );
}

/** Papers: the reading cadence in one sentence, status chips with counts, and the queue. */
export function PapersView({ atlas, states }: { atlas: Atlas; states: Map<string, PaperState> }) {
  const [status, setStatus] = useQueryParam('status');
  const [paperId, setPaperId] = useQueryParam('paper');
  const { seed, settings } = atlas;
  const cadence = cadenceStatus(seed.phases, settings.core.paperCadence, states, today(), settings.core.weekStartsOn);
  const next = nextPaper(seed.papers, states);
  const statusOf = (p: Paper): PaperStatus => states.get(p.id)?.status ?? 'queued';
  const shown = seed.papers.filter((p) => !status || statusOf(p) === status);
  const open = paperId ? (seed.papers.find((p) => p.id === paperId) ?? null) : null;

  const sentence = cadence.active
    ? cadence.read + ' read of ' + cadence.expected + ' expected · ' + (cadence.behindBy > 0 ? cadence.behindBy + ' behind' : 'on pace') + (cadence.readThisWeek ? '' : ' · nothing read this week yet')
    : 'One paper a week starts with year ' + settings.core.paperCadence.fromYear + (cadence.startsOn ? ' on ' + longDate(cadence.startsOn) : '') + '. Reading before then is a head start.';

  return (
    <div className="space-y-5">
      <p className="text-meta text-ink2">{sentence}</p>
      <Chips
        label="Status"
        items={PAPER_STATUSES.map((s) => ({
          key: s.value,
          label: s.label,
          count: seed.papers.filter((p) => statusOf(p) === s.value).length,
          pressed: status === s.value,
          onClick: () => setStatus(status === s.value ? null : s.value),
        }))}
      />
      {next && !status && (
        <RowList label="Next up">
          <Row title={next.title} meta={[next.authors, next.year].filter(Boolean).join(' · ')} onClick={() => setPaperId(next.id, { replace: false })} />
        </RowList>
      )}
      <RowList label={status ? PAPER_STATUSES.find((s) => s.value === status)?.label : 'All papers'}>
        {shown.map((paper) => (
          <Row
            key={paper.id}
            title={paper.title}
            meta={[paper.authors, paper.year].filter(Boolean).join(' · ')}
            onClick={() => setPaperId(paper.id, { replace: false })}
            action={<PaperStatusPill paper={paper} status={statusOf(paper)} />}
          />
        ))}
        {shown.length === 0 && <li className="py-3 text-meta text-ink2">No papers with that status yet.</li>}
      </RowList>
      {seed.paperSources.length > 0 && (
        <RowList label="Where to find more">
          {seed.paperSources.map((source) => (
            <Row key={source.id} title={source.title} meta={source.summary} href={source.url ?? undefined} />
          ))}
        </RowList>
      )}
      <PaperSheet paper={open} state={open ? states.get(open.id) : undefined} onClose={() => setPaperId(null)} />
    </div>
  );
}
