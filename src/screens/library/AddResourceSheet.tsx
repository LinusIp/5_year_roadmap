import { useState } from 'react';
import { addCustomEntity, slugifyId } from '../../db/edits.ts';
import { today } from '../../lib/dates.ts';
import { navigate } from '../../router/router.tsx';
import { RESOURCE_TYPES, ResourceSchema } from '../../seed/schema.ts';
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

const EMPTY = { title: '', provider: '', type: 'course', url: '', tracks: ['swe'] as TrackId[], level: 'intro', cost: 'free', estHours: '20', summary: '' };

/**
 * Adds a resource to the library. It is validated with the same schema as the YAML, so a resource you add
 * behaves exactly like one from /data, and a link you type in is recorded as checked by you, today.
 */
export function AddResourceSheet({ open, onClose, seed }: { open: boolean; onClose: () => void; seed: AppSeed }) {
  const [form, setForm] = useState(EMPTY);
  const [picking, setPicking] = useState<'type' | 'tracks' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]): void => setForm((f) => ({ ...f, [key]: value }));

  const close = (): void => {
    setForm(EMPTY);
    setError(null);
    onClose();
  };

  const submit = async (): Promise<void> => {
    setError(null);
    const taken = new Set([...seed.resources, ...seed.projects, ...seed.papers, ...seed.certs].map((x) => x.id));
    const id = slugifyId(form.title || 'resource', taken);
    const url = form.url.trim();
    const candidate = {
      id,
      title: form.title.trim(),
      provider: form.provider.trim() || 'Added by you',
      type: form.type,
      url: url || null,
      urlVerified: Boolean(url),
      ...(url ? { lastVerified: today() } : { searchHint: form.title.trim() || 'resource' }),
      tracks: form.tracks,
      level: form.level,
      cost: form.cost,
      estHours: Number(form.estHours),
      prerequisites: [],
      ...(form.summary.trim() ? { summary: form.summary.trim() } : {}),
    };
    const parsed = ResourceSchema.safeParse(candidate);
    if (!parsed.success) {
      const field = String(parsed.error.issues[0]!.path[0] ?? 'form');
      const friendly: Record<string, string> = {
        title: 'Give it a title.',
        url: 'The link must be a full address starting with https://',
        estHours: 'Estimated hours must be a number from 0 to 2000.',
        tracks: 'Pick at least one track.',
      };
      setError(friendly[field] ?? 'Check the ' + field + ' field.');
      return;
    }
    await addCustomEntity('resource', id, candidate);
    close();
    navigate('/library/' + id);
  };

  const trackNames = form.tracks.map((t) => seed.tracks.find((x) => x.id === t)?.name ?? t).join(', ');

  return (
    <>
      <Sheet
        open={open && picking === null}
        title="Add a resource"
        onClose={close}
        footer={
          <Button variant="filled" onClick={() => void submit()}>
            Add to the library
          </Button>
        }
      >
        <div className="space-y-3">
          <TextField label="Title" value={form.title} onChange={(v) => set('title', v)} />
          <TextField label="Provider" value={form.provider} onChange={(v) => set('provider', v)} hint="MIT OCW, a publisher, a channel. Optional." />
          <TextField label="Link" type="url" value={form.url} onChange={(v) => set('url', v)} hint="Leave it empty and the item gets a search hint instead." />
          <TextField label="Estimated hours" type="numeric" value={form.estHours} onChange={(v) => set('estHours', v)} />
          <RowList plain>
            <Row title="Type" trailing={TYPE_LABEL[form.type]} onClick={() => setPicking('type')} />
            <Row title="Tracks" trailing={trackNames || 'None'} onClick={() => setPicking('tracks')} />
          </RowList>
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
          <TextField label="Why it is here" multiline rows={2} value={form.summary} onChange={(v) => set('summary', v)} hint="Optional." />
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
