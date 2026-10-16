import { useState } from 'react';
import { addCustomEntity, addPlanEdit, slugifyId } from '../../db/edits.ts';
import { today } from '../../lib/dates.ts';
import { navigate } from '../../router/router.tsx';
import { PAPER_GROUPS, PaperSchema, ProjectSchema, RESOURCE_TYPES, ResourceSchema, TrackSchema } from '../../seed/schema.ts';
import type { AppSeed, TrackId } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { SegmentedControl } from '../../ui/SegmentedControl.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { PickerSheet } from '../parts/PickerSheet.tsx';

export const TYPE_LABEL: Record<string, string> = {
  course: 'Course',
  lectures: 'Lecture series',
  book: 'Book',
  tutorial: 'Tutorial',
  article: 'Article',
  paper: 'Paper',
  repo: 'Repository',
  cert: 'Certification',
};

const GROUP_LABEL: Record<(typeof PAPER_GROUPS)[number], string> = {
  classics: 'Classics',
  llm: 'Language models',
  systems: 'Systems',
  'graphics-sim': 'Graphics and simulation',
  inference: 'Inference',
  generative: 'Generative models',
};

type Kind = 'resource' | 'project' | 'paper' | 'track';

const EMPTY = {
  title: '',
  provider: '',
  type: 'course',
  url: '',
  tracks: ['swe'] as TrackId[],
  level: 'intro',
  cost: 'free',
  estHours: '20',
  summary: '',
  units: '',
  subject: '',
  brief: '',
  acceptance: '',
  cadence: 'monthly',
  authors: '',
  group: 'classics',
  family: '',
  slot: '1',
};

/** "Lecture 1\nLecture 2" pasted in: one unit per non-empty line, with stable ids. */
function unitsFrom(text: string): { id: string; title: string }[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean)
    .map((title, i) => ({ id: 'unit-' + (i + 1), title }));
}

/**
 * Adds something of your own to the library: a resource, a project, a paper or a track. Each is validated with
 * the same schema as the YAML, carries `source: "user"`, and behaves like anything from /data. A link typed in
 * is recorded as checked by you, today; without one the item gets a search hint.
 */
export function AddResourceSheet({ open, onClose, seed }: { open: boolean; onClose: () => void; seed: AppSeed }) {
  const [kind, setKind] = useState<Kind>('resource');
  const [form, setForm] = useState(EMPTY);
  const [picking, setPicking] = useState<'type' | 'tracks' | 'subject' | 'group' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]): void => setForm((f) => ({ ...f, [key]: value }));

  const close = (): void => {
    setForm(EMPTY);
    setError(null);
    onClose();
  };

  const taken = new Set([...seed.resources, ...seed.projects, ...seed.papers, ...seed.certs].map((x) => x.id));
  const url = form.url.trim();
  const link = url ? { url, urlVerified: true, lastVerified: today() } : { url: null, urlVerified: false, searchHint: form.title.trim() || 'something of mine' };
  const friendly: Record<string, string> = {
    title: 'Give it a title.',
    name: 'Give it a name.',
    url: 'The link must be a full address starting with https://',
    estHours: 'Estimated hours must be a number.',
    tracks: 'Pick at least one track.',
    brief: 'Say in a sentence what you will build.',
    acceptance: 'List at least one thing that says it is done, one per line.',
    family: 'Give the track a family, such as “Arts”.',
    summary: 'Say in a sentence what the track is.',
  };
  const fail = (path: PropertyKey | undefined): void => setError(friendly[String(path ?? '')] ?? 'Check the ' + String(path ?? 'form') + ' field.');

  const submit = async (): Promise<void> => {
    setError(null);
    if (kind === 'track') {
      const id = ('my-' + form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')).slice(0, 40);
      const data = { id, name: form.title.trim(), family: form.family.trim() || 'Mine', slot: Number(form.slot), summary: form.summary.trim() || form.title.trim(), source: 'user' };
      const parsed = TrackSchema.safeParse(data);
      if (!parsed.success || id === 'my-') return fail(parsed.success ? 'name' : parsed.error.issues[0]!.path[0]);
      if (seed.tracks.some((t) => t.id === id)) return setError('There is a track with that name already.');
      await addPlanEdit([{ op: 'custom', kind: 'track', data }], 'Added the track ' + data.name);
      return close();
    }
    if (kind === 'paper') {
      const id = slugifyId(form.title || 'paper', taken);
      const data = { id, title: form.title.trim(), ...(form.authors.trim() ? { authors: form.authors.trim() } : {}), ...link, tracks: form.tracks, group: form.group, estHours: Number(form.estHours) || 3, source: 'user' };
      const parsed = PaperSchema.safeParse(data);
      if (!parsed.success) return fail(parsed.error.issues[0]!.path[0]);
      await addCustomEntity('paper', id, data);
      close();
      return navigate('/plan?view=papers');
    }
    if (kind === 'project') {
      const id = slugifyId(form.title || 'project', taken);
      const acceptance = unitsFrom(form.acceptance).map((u) => u.title);
      const data = {
        id,
        title: form.title.trim(),
        cadence: form.cadence,
        tracks: form.tracks,
        brief: form.brief.trim(),
        acceptance,
        estHours: Number(form.estHours),
        source: 'user',
        ...(form.subject ? { subject: form.subject } : {}),
      };
      const parsed = ProjectSchema.safeParse(data);
      if (!parsed.success) return fail(parsed.error.issues[0]!.path[0]);
      await addCustomEntity('project', id, data);
      close();
      return navigate('/library/' + id);
    }
    const id = slugifyId(form.title || 'resource', taken);
    const units = unitsFrom(form.units);
    const candidate = {
      id,
      title: form.title.trim(),
      provider: form.provider.trim() || 'Added by you',
      type: form.type,
      ...link,
      tracks: form.tracks,
      level: form.level,
      cost: form.cost,
      estHours: Number(form.estHours),
      prerequisites: [],
      source: 'user',
      ...(units.length > 0 ? { units } : {}),
      ...(form.subject ? { subject: form.subject } : {}),
      ...(form.summary.trim() ? { summary: form.summary.trim() } : {}),
    };
    const parsed = ResourceSchema.safeParse(candidate);
    if (!parsed.success) return fail(parsed.error.issues[0]!.path[0]);
    await addCustomEntity('resource', id, candidate);
    close();
    navigate('/library/' + id);
  };

  const trackNames = form.tracks.map((t) => seed.tracks.find((x) => x.id === t)?.name ?? t).join(', ');
  const subjectName = seed.subjects.find((s) => s.id === form.subject)?.title ?? 'None';
  const title = { resource: 'Add a resource', project: 'Add a project', paper: 'Add a paper', track: 'Add a track' }[kind];

  return (
    <>
      <Sheet
        open={open && picking === null}
        title={title}
        onClose={close}
        footer={
          <Button variant="filled" onClick={() => void submit()}>
            {kind === 'track' ? 'Add the track' : 'Add to the library'}
          </Button>
        }
      >
        <div className="space-y-3">
          <SegmentedControl
            label="What to add"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'resource', label: 'Resource' },
              { value: 'project', label: 'Project' },
              { value: 'paper', label: 'Paper' },
              { value: 'track', label: 'Track' },
            ]}
          />
          <TextField label={kind === 'track' ? 'Name' : 'Title'} value={form.title} onChange={(v) => set('title', v)} />
          {kind === 'resource' && <TextField label="Provider" value={form.provider} onChange={(v) => set('provider', v)} hint="MIT OCW, a publisher, a channel. Optional." />}
          {kind === 'paper' && <TextField label="Authors" value={form.authors} onChange={(v) => set('authors', v)} hint="Optional." />}
          {(kind === 'resource' || kind === 'paper') && <TextField label="Link" type="url" value={form.url} onChange={(v) => set('url', v)} hint="Leave it empty and the item gets a search hint instead." />}
          {kind !== 'track' && <TextField label="Estimated hours" type="numeric" value={form.estHours} onChange={(v) => set('estHours', v)} />}
          {kind === 'project' && (
            <>
              <TextField label="What you will build" multiline rows={2} value={form.brief} onChange={(v) => set('brief', v)} />
              <TextField label="Done when" multiline rows={3} value={form.acceptance} onChange={(v) => set('acceptance', v)} hint="One criterion per line." />
              <SegmentedControl
                label="Cadence"
                value={form.cadence}
                onChange={(v) => set('cadence', v)}
                options={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'research', label: 'Research' },
                ]}
              />
            </>
          )}
          {kind === 'track' && (
            <>
              <TextField label="Family" value={form.family} onChange={(v) => set('family', v)} hint="Tracks of one family share a colour, such as “Arts”." />
              <SegmentedControl label="Colour" value={form.slot} onChange={(v) => set('slot', v)} options={['1', '2', '3', '4', '5', '6', '7', '8'].map((n) => ({ value: n, label: n }))} />
            </>
          )}
          {kind !== 'track' && (
            <RowList plain>
              {kind === 'resource' && <Row title="Type" trailing={TYPE_LABEL[form.type]} onClick={() => setPicking('type')} />}
              {kind === 'paper' && <Row title="Group" trailing={GROUP_LABEL[form.group as keyof typeof GROUP_LABEL]} onClick={() => setPicking('group')} />}
              <Row title="Tracks" trailing={trackNames || 'None'} onClick={() => setPicking('tracks')} />
              {kind !== 'paper' && <Row title="Credential row" trailing={subjectName} onClick={() => setPicking('subject')} />}
            </RowList>
          )}
          {kind === 'resource' && (
            <>
              <SegmentedControl
                label="Level"
                value={form.level}
                onChange={(v) => set('level', v)}
                options={[
                  { value: 'intro', label: 'Intro' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' },
                ]}
              />
              <SegmentedControl
                label="Cost"
                value={form.cost}
                onChange={(v) => set('cost', v)}
                options={[
                  { value: 'free', label: 'Free' },
                  { value: 'audit-free', label: 'Free to audit' },
                  { value: 'paid', label: 'Paid' },
                ]}
              />
              <TextField label="Units" multiline rows={3} value={form.units} onChange={(v) => set('units', v)} hint="Optional: paste the lectures or chapters, one per line, to tick them off." />
            </>
          )}
          {(kind === 'resource' || kind === 'track') && (
            <TextField label={kind === 'track' ? 'What it is' : 'Why it is here'} multiline rows={2} value={form.summary} onChange={(v) => set('summary', v)} hint="Optional." />
          )}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-meta font-medium text-ink">
            {error}
          </p>
        )}
      </Sheet>
      <PickerSheet
        open={open && picking === 'type'}
        title="Type"
        value={form.type}
        options={RESOURCE_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] ?? t }))}
        onPick={(v) => v && set('type', v)}
        onClose={() => setPicking(null)}
      />
      <PickerSheet
        open={open && picking === 'group'}
        title="Group"
        value={form.group}
        options={PAPER_GROUPS.map((g) => ({ value: g, label: GROUP_LABEL[g] }))}
        onPick={(v) => v && set('group', v)}
        onClose={() => setPicking(null)}
      />
      <PickerSheet
        open={open && picking === 'subject'}
        title="Credential row"
        clearLabel="None"
        value={form.subject || null}
        options={seed.subjects.map((s) => ({ value: s.id, label: s.title }))}
        onPick={(v) => set('subject', v ?? '')}
        onClose={() => setPicking(null)}
      />
      <PickerSheet
        open={open && picking === 'tracks'}
        title="Tracks"
        searchLabel="Search tracks"
        multi
        value={form.tracks}
        options={seed.tracks.map((t) => ({ value: t.id, label: t.name, keywords: t.summary }))}
        onPick={(v) => v && set('tracks', form.tracks.includes(v as TrackId) ? form.tracks.filter((t) => t !== v) : [...form.tracks, v as TrackId])}
        onClose={() => setPicking(null)}
      />
    </>
  );
}
