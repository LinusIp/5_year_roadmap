import { useMemo, useState } from 'react';
import { addCustomEntity, slugifyId } from '../db/edits.ts';
import { nextOrder } from '../lib/plan.ts';
import { parseDuration } from '../lib/dates.ts';
import { TRACK_IDS } from '../seed/schema.ts';
import type { AppSeed, BlockId, TrackId } from '../seed/schema.ts';
import { Modal } from './Modal.tsx';

interface AddItemFormProps {
  open: boolean;
  onClose: () => void;
  seed: AppSeed;
  phaseId: string;
  block: BlockId;
  blockName: string;
}

type Mode = 'library' | 'new';

/**
 * Adds an item to a lane: either something already in the library, or a new resource of your own.
 * A new resource is validated with the same schema as the YAML, so it behaves like any other.
 */
export function AddItemForm({ open, onClose, seed, phaseId, block, blockName }: AddItemFormProps) {
  const [mode, setMode] = useState<Mode>('library');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string>('');
  const [title, setTitle] = useState('');
  const [provider, setProvider] = useState('');
  const [url, setUrl] = useState('');
  const [hours, setHours] = useState('20');
  const [track, setTrack] = useState<TrackId>('swe');
  const [error, setError] = useState<string | null>(null);

  const planned = useMemo(() => new Set(seed.plan.map((i) => i.resourceId ?? i.projectId)), [seed.plan]);
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = [
      ...seed.resources.filter((r) => !r.reference).map((r) => ({ id: r.id, title: r.title, sub: r.provider, kind: 'resource' as const })),
      ...seed.projects.filter((p) => p.cadence !== 'weekly').map((p) => ({ id: p.id, title: p.title, sub: p.cadence, kind: 'project' as const })),
    ].filter((c) => !planned.has(c.id));
    return (q ? pool.filter((c) => c.title.toLowerCase().includes(q) || c.id.includes(q)) : pool).slice(0, 40);
  }, [query, seed, planned]);

  const reset = (): void => {
    setQuery('');
    setPicked('');
    setTitle('');
    setProvider('');
    setUrl('');
    setHours('20');
    setError(null);
  };

  const close = (): void => {
    reset();
    onClose();
  };

  const submit = async (): Promise<void> => {
    setError(null);
    const taken = new Set([
      ...seed.resources.map((r) => r.id),
      ...seed.projects.map((p) => p.id),
      ...seed.papers.map((p) => p.id),
      ...seed.certs.map((c) => c.id),
      ...seed.plan.map((i) => i.id),
    ]);
    const order = nextOrder(seed.plan, phaseId, block);

    if (mode === 'library') {
      const candidate = candidates.find((c) => c.id === picked) ?? [...seed.resources, ...seed.projects].find((c) => c.id === picked);
      if (!picked || !candidate) {
        setError('Pick something from the list.');
        return;
      }
      const isResource = seed.resources.some((r) => r.id === picked);
      const planId = slugifyId(picked, taken, 'plan');
      await addCustomEntity('planItem', planId, {
        id: planId,
        phaseId,
        block,
        order,
        ...(isResource ? { resourceId: picked } : { projectId: picked }),
      });
      close();
      return;
    }

    const minutes = parseDuration(hours.includes('h') || hours.includes('m') ? hours : hours + 'h');
    if (!title.trim()) {
      setError('Give it a title.');
      return;
    }
    if (minutes === null || minutes <= 0) {
      setError('Estimated hours must be a number, like 20.');
      return;
    }
    let link: string | null = null;
    if (url.trim()) {
      try {
        const parsed = new URL(url.trim());
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('protocol');
        link = parsed.href;
      } catch {
        setError('The link must be a full address starting with https://');
        return;
      }
    }

    const id = slugifyId(title, taken);
    const today = new Date();
    const lastVerified = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    // A link typed in by the user counts as verified by them; one left blank gets a search hint instead.
    await addCustomEntity('resource', id, {
      id,
      title: title.trim(),
      provider: provider.trim() || 'Added by you',
      type: 'course',
      url: link,
      urlVerified: link !== null,
      ...(link ? { lastVerified } : { searchHint: title.trim() }),
      tracks: [track],
      level: 'intro',
      cost: 'free',
      estHours: Math.round((minutes / 60) * 10) / 10,
      prerequisites: [],
    });
    const planId = slugifyId(id, taken, 'plan');
    await addCustomEntity('planItem', planId, { id: planId, phaseId, block, order, resourceId: id });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={'Add to ' + blockName}
      footer={
        <>
          <button type="button" className="btn" onClick={close}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void submit()}>
            Add to the lane
          </button>
        </>
      }
    >
      <div className="mb-4 flex gap-1" role="tablist" aria-label="What to add">
        {(['library', 'new'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={'btn btn-sm' + (mode === m ? ' btn-primary' : '')}
            onClick={() => setMode(m)}
          >
            {m === 'library' ? 'From the library' : 'Something new'}
          </button>
        ))}
      </div>

      {mode === 'library' ? (
        <div>
          <label className="block">
            <span className="label">Search</span>
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="CS229, Fluent Python, a project…" />
          </label>
          <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto" role="listbox" aria-label="Items not yet on the roadmap">
            {candidates.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={picked === c.id}
                  className={
                    'w-full rounded-lg border px-3 py-2 text-left text-sm ' +
                    (picked === c.id ? 'border-accent bg-accent-wash' : 'border-line hover:bg-raised')
                  }
                  onClick={() => setPicked(c.id)}
                >
                  <span className="font-medium">{c.title}</span>
                  <span className="ml-2 text-xs text-ink-3">{c.sub}</span>
                </button>
              </li>
            ))}
            {candidates.length === 0 && <li className="py-3 text-sm text-ink-3">Nothing matches that isn&apos;t already planned.</li>}
          </ul>
        </div>
      ) : (
        <div className="grid gap-3">
          <label className="block">
            <span className="label">Title</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A course, book or project" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Provider</span>
              <input className="input" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Optional" />
            </label>
            <label className="block">
              <span className="label">Estimated hours</span>
              <input className="input num" value={hours} onChange={(e) => setHours(e.target.value)} inputMode="decimal" />
            </label>
          </div>
          <label className="block">
            <span className="label">Link</span>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (leave empty if you do not have one yet)" />
          </label>
          <label className="block">
            <span className="label">Track</span>
            <select className="input" value={track} onChange={(e) => setTrack(e.target.value as TrackId)}>
              {TRACK_IDS.map((id) => (
                <option key={id} value={id}>
                  {seed.tracks.find((t) => t.id === id)?.name ?? id}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-critical-text">
          {error}
        </p>
      )}
    </Modal>
  );
}
