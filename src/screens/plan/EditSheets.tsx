import { useMemo, useState } from 'react';
import { addPlanEdit, undoPlanEdit } from '../../db/edits.ts';
import type { NewPlanPatch } from '../../db/types.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { formatLong, formatRange, today } from '../../lib/dates.ts';
import { goalStatus } from '../../lib/goals.ts';
import { undoableGroups } from '../../lib/plan.ts';
import { insertPhase, movePrerequisites, newPhaseId, placeInLane, prerequisiteConflicts, shiftPhaseEnd, splitPhase, swapCandidates } from '../../lib/plan-edit.ts';
import type { PrereqConflict } from '../../lib/plan-edit.ts';
import type { BlockId, Goal, Phase, PlanItem } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { PickerSheet } from '../parts/PickerSheet.tsx';
import { blockShort, shortTitle } from '../parts/text.ts';
import { parseDateInput } from '../settings/shared.tsx';

function titleOf(atlas: Atlas, refId: string): string {
  return atlas.seed.resources.find((r) => r.id === refId)?.title ?? atlas.seed.projects.find((p) => p.id === refId)?.title ?? refId;
}

function phaseLabel(phase: Phase): string {
  return 'Year ' + phase.year + ' · ' + phase.title;
}

function Conflict({ atlas, conflicts }: { atlas: Atlas; conflicts: PrereqConflict[] }) {
  if (conflicts.length === 0) return null;
  return (
    <p role="alert" className="text-meta text-ink">
      This would come before {conflicts.map((c) => shortTitle(titleOf(atlas, c.prereqId)) + ' (' + (atlas.seed.phases.find((p) => p.id === c.phaseId)?.title ?? c.phaseId) + ')').join(' and ')}, which it needs first.
    </p>
  );
}

/* ------------------------------------------------------------------ add to plan */

type AddPick = 'phase' | 'lane' | 'position' | null;

/** "Add to plan" from an item's sheet: a phase, a lane and a position in it. */
export function AddToPlanSheet({ atlas, refId, open, onClose }: { atlas: Atlas; refId: string; open: boolean; onClose: () => void }) {
  const { seed, settings } = atlas;
  const now = today();
  const current = seed.phases.find((p) => p.start <= now && now <= p.end) ?? seed.phases[0]!;
  const [phaseId, setPhaseId] = useState(current.id);
  const [block, setBlock] = useState<BlockId>(() => {
    const resource = seed.resources.find((r) => r.id === refId);
    if (seed.projects.some((p) => p.id === refId)) return 'D';
    return resource?.tracks.includes('math') || resource?.tracks.includes('physics') ? 'E' : 'C';
  });
  const lane = seed.plan.filter((i) => i.phaseId === phaseId && i.block === block).sort((a, b) => a.order - b.order);
  const [index, setIndex] = useState<number | null>(null);
  const position = index ?? lane.length;
  const [picking, setPicking] = useState<AddPick>(null);
  const isDone = (id: string): boolean => atlas.states.get(id)?.status === 'done';
  const conflicts = prerequisiteConflicts(seed, refId, phaseId, isDone);
  const title = shortTitle(titleOf(atlas, refId));
  const phase = seed.phases.find((p) => p.id === phaseId)!;
  const blockName = blockShort(settings.core.blocks.find((b) => b.id === block)?.name ?? block);

  const add = async (withPrereqs: boolean): Promise<void> => {
    const patches: NewPlanPatch[] = placeInLane(seed, refId, phaseId, block, position);
    if (withPrereqs) patches.push(...movePrerequisites(seed, conflicts, phaseId));
    await addPlanEdit(patches, 'Added ' + title + ' to ' + phase.title + ', ' + blockName);
    onClose();
  };

  return (
    <>
      <Sheet
        open={open && picking === null}
        title={'Add ' + title + ' to the plan'}
        onClose={onClose}
        footer={
          conflicts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="filled" onClick={() => void add(true)}>
                Add, and move {conflicts.length === 1 ? 'the prerequisite' : 'the prerequisites'} too
              </Button>
              <Button onClick={() => void add(false)}>Add it anyway</Button>
            </div>
          ) : (
            <Button variant="filled" onClick={() => void add(false)}>
              Add to the plan
            </Button>
          )
        }
      >
        <RowList plain>
          <Row title="Phase" trailing={phaseLabel(phase)} onClick={() => setPicking('phase')} />
          <Row title="Lane" trailing={'Block ' + block + ' · ' + blockName} onClick={() => setPicking('lane')} />
          <Row title="Position" trailing={position >= lane.length ? 'At the end' : 'Before ' + shortTitle(titleOf(atlas, lane[position]!.resourceId ?? lane[position]!.projectId!))} onClick={() => setPicking('position')} />
        </RowList>
        <div className="mt-3">
          <Conflict atlas={atlas} conflicts={conflicts} />
        </div>
      </Sheet>
      <PickerSheet
        open={open && picking === 'phase'}
        title="Phase"
        value={phaseId}
        options={seed.phases.map((p) => ({ value: p.id, label: phaseLabel(p), meta: formatRange(p.start, p.end) }))}
        onPick={(v) => {
          if (v) setPhaseId(v);
          setIndex(null);
        }}
        onClose={() => setPicking(null)}
      />
      <PickerSheet
        open={open && picking === 'lane'}
        title="Lane"
        value={block}
        options={settings.core.blocks.map((b) => ({ value: b.id, label: 'Block ' + b.id + ' · ' + blockShort(b.name) }))}
        onPick={(v) => {
          if (v) setBlock(v);
          setIndex(null);
        }}
        onClose={() => setPicking(null)}
      />
      <PickerSheet
        open={open && picking === 'position'}
        title="Position"
        value={String(position)}
        options={[...lane.map((i, n) => ({ value: String(n), label: 'Before ' + shortTitle(titleOf(atlas, i.resourceId ?? i.projectId!)) })), { value: String(lane.length), label: 'At the end' }]}
        onPick={(v) => v !== null && setIndex(Number(v))}
        onClose={() => setPicking(null)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ swap */

/** Swap an item on the plan for another: the curriculum's named alternatives first, then search. */
export function SwapSheet({ atlas, planItem, onClose }: { atlas: Atlas; planItem: PlanItem | null; onClose: () => void }) {
  const refId = planItem ? (planItem.resourceId ?? planItem.projectId!) : '';
  const candidates = useMemo(() => (planItem ? swapCandidates(atlas.seed, refId) : { named: [], others: [] }), [atlas.seed, planItem, refId]);
  // Every resource is a candidate (ten thousand, ATLAS-LIBRARY): one pass with maps, once per curriculum.
  const options = useMemo(() => {
    const resources = new Map(atlas.seed.resources.map((r) => [r.id, r]));
    const projects = new Map(atlas.seed.projects.map((p) => [p.id, p.title]));
    const named = new Set(candidates.named);
    return [...candidates.named, ...candidates.others].map((id) => {
      const resource = resources.get(id);
      return { value: id, label: resource?.title ?? projects.get(id) ?? id, meta: named.has(id) ? 'Alternative' : (resource?.provider ?? 'Project') };
    });
  }, [atlas.seed, candidates]);
  return (
    <PickerSheet
      open={planItem !== null}
      title={'Swap ' + shortTitle(titleOf(atlas, refId)) + ' for'}
      searchLabel="Search the library"
      value={null}
      options={options}
      onPick={(v) => {
        if (!v || !planItem) return;
        const isResource = atlas.seed.resources.some((r) => r.id === v);
        void addPlanEdit([{ op: 'swap', planItemId: planItem.id, ...(isResource ? { resourceId: v } : { projectId: v }) }], 'Swapped ' + shortTitle(titleOf(atlas, refId)) + ' for ' + shortTitle(titleOf(atlas, v)));
      }}
      onClose={onClose}
    />
  );
}

/* ------------------------------------------------------------------ phases */

/** A phase: rename, change its last day (later phases shift, shown first), its goal and lane focus; add or split. */
export function PhaseSheet({ atlas, phase, onClose }: { atlas: Atlas; phase: Phase | null; onClose: () => void }) {
  const [title, setTitle] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [focus, setFocus] = useState<Record<string, string>>({});
  const [newTitle, setNewTitle] = useState('');
  const [newWeeks, setNewWeeks] = useState('4');
  const [splitAt, setSplitAt] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const phases = atlas.seed.phases;
  const close = (): void => {
    setTitle(null);
    setGoal(null);
    setEnd(null);
    setFocus({});
    setNewTitle('');
    setSplitAt('');
    setProblem(null);
    onClose();
  };
  if (!phase) return <Sheet open={false} title="" onClose={close}>{null}</Sheet>;

  const endDate = end !== null ? parseDateInput(end) : null;
  const preview = endDate && endDate !== phase.end ? shiftPhaseEnd(phases, phase.id, endDate) : null;
  const save = async (patches: NewPlanPatch[], label: string): Promise<void> => {
    if (patches.length === 0) return;
    await addPlanEdit(patches, label);
  };

  return (
    <Sheet open title={phase.title} onClose={close}>
      <div className="space-y-4">
        <TextField
          label="Name"
          value={title ?? phase.title}
          onChange={setTitle}
          onBlur={() => {
            const next = (title ?? '').trim();
            if (next && next !== phase.title) void save([{ op: 'editPhase', phaseId: phase.id, title: next }], 'Renamed ' + phase.title + ' to ' + next);
            setTitle(null);
          }}
        />
        <TextField
          label="Goal"
          multiline
          rows={2}
          value={goal ?? phase.goal}
          onChange={setGoal}
          onBlur={() => {
            const next = (goal ?? '').trim();
            if (next && next !== phase.goal) void save([{ op: 'editPhase', phaseId: phase.id, goal: next }], 'Changed the goal of ' + phase.title);
            setGoal(null);
          }}
        />
        <div>
          <TextField label="Last day" value={end ?? phase.end} onChange={setEnd} hint={'Starts ' + formatLong(phase.start) + '. YYYY-MM-DD; later phases move with it.'} error={end !== null && !endDate ? 'Write a date as YYYY-MM-DD.' : null} />
          {preview && preview.shifts.length > 0 && (
            <div className="mt-3">
              <RowList label="What moves">
                {preview.shifts.map((s) => (
                  <Row key={s.phaseId} title={s.title} meta={formatRange(s.from.start, s.from.end) + ' → ' + formatRange(s.to.start, s.to.end)} />
                ))}
              </RowList>
              <div className="mt-2 flex gap-2">
                <Button
                  onClick={() => {
                    const stretch = endDate! > phase.end ? 'Stretched ' : 'Compressed ';
                    void save(preview.patches, stretch + phase.title + ' to ' + formatLong(endDate!)).then(() => setEnd(null));
                  }}
                >
                  Apply
                </Button>
                <Button variant="icon" onClick={() => setEnd(null)}>
                  Keep the dates
                </Button>
              </div>
            </div>
          )}
        </div>
        <RowList label="Lane focus">
          {atlas.settings.core.blocks.map((b) => {
            const value = (phase.focus as Record<string, string | undefined>)[b.id] ?? '';
            return (
              <li key={b.id} className="py-2">
                <TextField
                  label={'Block ' + b.id + ' · ' + blockShort(b.name)}
                  value={focus[b.id] ?? value}
                  onChange={(v) => setFocus((f) => ({ ...f, [b.id]: v }))}
                  onBlur={() => {
                    const next = (focus[b.id] ?? '').trim();
                    if (next && next !== value) void save([{ op: 'editPhase', phaseId: phase.id, focus: { [b.id]: next } }], 'Changed the focus of block ' + b.id);
                    setFocus((f) => {
                      const { [b.id]: _drop, ...rest } = f;
                      return rest;
                    });
                  }}
                />
              </li>
            );
          })}
        </RowList>
        <div className="space-y-3">
          <h3 className="section-label">Add a phase after this one</h3>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <TextField label="Name" value={newTitle} onChange={setNewTitle} />
            <TextField label="Weeks" type="numeric" value={newWeeks} onChange={setNewWeeks} />
          </div>
          <Button
            onClick={() => {
              const weeks = Number(newWeeks);
              if (!newTitle.trim() || !(weeks >= 1 && weeks <= 104)) return setProblem('Give the new phase a name and 1 to 104 weeks.');
              setProblem(null);
              void save(insertPhase(phases, phase.id, newTitle.trim(), Math.round(weeks * 7), newPhaseId(phases)), 'Added the phase ' + newTitle.trim()).then(() => setNewTitle(''));
            }}
          >
            Add the phase
          </Button>
        </div>
        <div className="space-y-3">
          <h3 className="section-label">Split this phase</h3>
          <TextField label="The second part starts on" value={splitAt} onChange={setSplitAt} hint="YYYY-MM-DD, inside the phase. Items stay in the first part." />
          <Button
            onClick={() => {
              const at = parseDateInput(splitAt);
              const patches = at ? splitPhase(phases, phase.id, at, newPhaseId(phases)) : [];
              if (patches.length === 0) return setProblem('The split must fall after the phase starts and on or before its last day.');
              setProblem(null);
              void save(patches, 'Split ' + phase.title).then(() => setSplitAt(''));
            }}
          >
            Split
          </Button>
        </div>
        {problem && (
          <p role="alert" className="text-meta font-medium text-ink">
            {problem}
          </p>
        )}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ goals */

export function GoalSheet({ atlas, goal, onClose }: { atlas: Atlas; goal: Goal | 'new' | null; onClose: () => void }) {
  const existing = goal && goal !== 'new' ? goal : null;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? '');
  const [links, setLinks] = useState<string[]>(existing?.links ?? []);
  const [picking, setPicking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const status = existing ? goalStatus(existing, atlas.seed, atlas.settings, atlas.states, atlas.logs, today()) : null;
  const nodes = atlas.seed.roadmaps.flatMap((r) => r.sections.flatMap((s) => s.nodes.map((n) => ({ value: r.id + '/' + n.id, label: n.label, meta: r.title }))));

  const save = (): void => {
    const when = parseDateInput(date);
    if (!title.trim() || !when) return setProblem('A goal needs a name and a date (YYYY-MM-DD).');
    const id = existing?.id ?? 'goal-' + Date.now().toString(36);
    void addPlanEdit([{ op: 'goal', goal: { id, title: title.trim(), date: when, links } }], (existing ? 'Changed the goal ' : 'Added the goal ') + title.trim()).then(onClose);
  };

  return (
    <>
      <Sheet
        open={goal !== null && !picking}
        title={existing ? existing.title : 'A goal'}
        onClose={onClose}
        footer={
          <div className="flex gap-2">
            <Button variant="filled" onClick={save}>
              Save
            </Button>
            {existing && <Button onClick={() => void addPlanEdit([{ op: 'goal', goal: existing, remove: true }], 'Removed the goal ' + existing.title).then(onClose)}>Remove</Button>}
          </div>
        }
      >
        <div className="space-y-3">
          <TextField label="Goal" value={title} onChange={setTitle} hint="“Ship my inference server”" />
          <TextField label="By" value={date} onChange={setDate} hint="YYYY-MM-DD" />
          <RowList plain>
            <Row title="What it depends on" meta={links.length === 0 ? 'Items or roadmap nodes' : links.map((l) => (l.includes('/') ? (nodes.find((n) => n.value === l)?.label ?? l) : shortTitle(titleOf(atlas, l)))).join(', ')} onClick={() => setPicking(true)} />
          </RowList>
          {status && (
            <p className="text-meta text-ink2">
              {status.verdict === 'done' ? 'Done.' : status.verdict === 'on-track' ? 'On track: projected for ' + formatLong(status.projected!) + '.' : status.projected ? 'At risk: projected for ' + formatLong(status.projected) + '.' : 'At risk: ' + (status.unplanned.length > 0 ? 'something it needs is not on the plan.' : 'no projection yet.')}
            </p>
          )}
          {problem && (
            <p role="alert" className="text-meta font-medium text-ink">
              {problem}
            </p>
          )}
        </div>
      </Sheet>
      <PickerSheet
        open={goal !== null && picking}
        multi
        title="What it depends on"
        searchLabel="Search items and nodes"
        value={links}
        options={[
          ...atlas.seed.resources.filter((r) => !r.reference).map((r) => ({ value: r.id, label: r.title, meta: r.provider })),
          ...atlas.seed.projects.filter((p) => p.cadence !== 'weekly').map((p) => ({ value: p.id, label: p.title, meta: 'Project' })),
          ...nodes,
        ]}
        onPick={(v) => v && setLinks((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]))}
        onClose={() => setPicking(false)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ edit menu */

type Open = { kind: 'phase'; phase: Phase } | { kind: 'goal'; goal: Goal | 'new' } | null;

/** Plan > Edit plan: the plan's phases, goals and the last 50 edits with Undo. */
export function EditPlanSheet({ atlas, open, onClose }: { atlas: Atlas; open: boolean; onClose: () => void }) {
  const [sub, setSub] = useState<Open>(null);
  const groups = undoableGroups(atlas.patches);
  return (
    <>
      <Sheet open={open && sub === null} title="Edit the plan" onClose={onClose}>
        <RowList label="Phases">
          {atlas.seed.phases.map((p) => (
            <Row key={p.id} title={p.title} meta={'Year ' + p.year + ' · ' + formatRange(p.start, p.end)} onClick={() => setSub({ kind: 'phase', phase: p })} />
          ))}
        </RowList>
        <RowList className="mt-4" label="Goals">
          {(atlas.seed.goals ?? []).map((g) => (
            <Row key={g.id} title={g.title} meta={'By ' + formatLong(g.date)} onClick={() => setSub({ kind: 'goal', goal: g })} />
          ))}
          <Row title="Add a goal" meta="A date, and what it depends on" onClick={() => setSub({ kind: 'goal', goal: 'new' })} />
        </RowList>
        <RowList className="mt-4" label={groups.length > 0 ? 'Recent edits' : 'No edits yet'}>
          {groups.map((g) => (
            <Row key={g.group} title={g.label} meta={formatLong(g.at.slice(0, 10))} action={<Button size="sm" icon="undo" onClick={() => void undoPlanEdit(g.group)}>Undo</Button>} />
          ))}
        </RowList>
      </Sheet>
      <PhaseSheet atlas={atlas} phase={sub?.kind === 'phase' ? (atlas.seed.phases.find((p) => p.id === sub.phase.id) ?? null) : null} onClose={() => setSub(null)} />
      {sub?.kind === 'goal' && <GoalSheet key={sub.goal === 'new' ? 'new' : sub.goal.id} atlas={atlas} goal={sub.goal} onClose={() => setSub(null)} />}
    </>
  );
}
