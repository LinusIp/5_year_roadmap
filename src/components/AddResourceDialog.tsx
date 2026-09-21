import { useState } from 'react';
import { Modal } from './Modal.tsx';
import { addCustomEntity, slugifyId } from '../db/edits.ts';
import { navigate } from '../router/router.tsx';
import { today } from '../lib/dates.ts';
import { COSTS, LEVELS, RESOURCE_TYPES, ResourceSchema, TRACK_IDS } from '../seed/schema.ts';
import type { AppSeed, TrackId } from '../seed/schema.ts';

const TYPE_LABEL: Record<string, string> = {
  course: 'Course', lectures: 'Lecture series', book: 'Book', tutorial: 'Tutorial', article: 'Article', paper: 'Paper', repo: 'Repository', cert: 'Certification',
};

/**
 * Adds a resource to the library. It is validated with the same schema as the YAML, so a resource you add
 * behaves exactly like one from /data, and a link you type in is recorded as verified by you, today.
 */
export function AddResourceDialog({ open, onClose, seed }: { open: boolean; onClose: () => void; seed: AppSeed }) {
  const [form, setForm] = useState({
    title: '', provider: '', type: 'course', url: '', tracks: ['swe'] as TrackId[], level: 'intro', cost: 'free', estHours: '20', summary: '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form, value: string | TrackId[]): void => setForm((f) => ({ ...f, [key]: value }));

  const close = (): void => {
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
      const issue = parsed.error.issues[0]!;
      const field = String(issue.path[0] ?? 'form');
      const friendly: Record<string, string> = {
        title: 'Give it a title.',
        url: 'The link must be a full address starting with https://',
        estHours: 'Estimated hours must be a number from 0 to 2000.',
        tracks: 'Pick at least one track.',
      };
      setError(friendly[field] ?? field + ': ' + issue.message);
      return;
    }
    await addCustomEntity('resource', id, candidate);
    close();
    navigate('/library/' + id);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a resource"
      footer={
        <>
          <button type="button" className="btn" onClick={close}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void submit()}>
            Add to the library
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className="block">
          <span className="label">Title</span>
          <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Provider</span>
            <input className="input" value={form.provider} onChange={(e) => set('provider', e.target.value)} placeholder="MIT OCW, a publisher, a YouTube channel…" />
          </label>
          <label className="block">
            <span className="label">Type</span>
            <select className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {RESOURCE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="label">Link</span>
          <input className="input" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://… (leave empty to get a find-link badge instead)" />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="label">Level</span>
            <select className="input" value={form.level} onChange={(e) => set('level', e.target.value)}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Cost</span>
            <select className="input" value={form.cost} onChange={(e) => set('cost', e.target.value)}>
              {COSTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Estimated hours</span>
            <input className="input num" inputMode="decimal" value={form.estHours} onChange={(e) => set('estHours', e.target.value)} />
          </label>
        </div>
        <fieldset>
          <legend className="label">Tracks</legend>
          <div className="flex flex-wrap gap-1.5">
            {TRACK_IDS.map((id) => {
              const on = form.tracks.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  className={'btn btn-sm' + (on ? ' btn-primary' : '')}
                  onClick={() => set('tracks', on ? form.tracks.filter((t) => t !== id) : [...form.tracks, id])}
                >
                  {seed.tracks.find((t) => t.id === id)?.name ?? id}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="block">
          <span className="label">Summary</span>
          <textarea className="input" rows={2} value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Optional: why it is here" />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-critical-text">
          {error}
        </p>
      )}
    </Modal>
  );
}
