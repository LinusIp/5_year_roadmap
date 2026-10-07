import { useMemo, useState } from 'react';
import { addCustomEntity, slugifyId } from '../../db/edits.ts';
import { parseDuration, today } from '../../lib/dates.ts';
import { nextOrder } from '../../lib/plan.ts';
import type { AppSeed, BlockId, TrackId } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { SegmentedControl } from '../../ui/SegmentedControl.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { PickerSheet } from '../parts/PickerSheet.tsx';

type Mode = 'library' | 'new';

/**
 * Adds an item to a lane: something already in the library, or a new resource of your own. A new resource is
 * validated with the same schema as the YAML, so it behaves like any other.
 */
export function AddToLaneSheet({ open, onClose, seed, phaseId, block, title }: { open: boolean; onClose: () => void; seed: AppSeed; phaseId: string; block: BlockId; title: string }) {
  const [mode, setMode] = useState<Mode>('library');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [url, setUrl] = useState('');
  const [hours, setHours] = useState('20');
  const [track, setTrack] = useState<TrackId>('swe');
  const [pickingTrack, setPickingTrack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planned = useMemo(() => new Set(seed.plan.map((i) => i.resourceId ?? i.projectId)), [seed.plan]);
  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = [
      ...seed.resources.filter((r) => !r.reference).map((r) => ({ id: r.id, title: r.title, sub: r.provider + ' · ' + r.estHours + ' h' })),
      ...seed.projects.filter((p) => p.cadence !== 'weekly').map((p) => ({ id: p.id, title: p.title, sub: (p.cadence === 'monthly' ? 'Monthly project' : 'Capstone') + ' · ' + p.estHours + ' h' })),
    ].filter((c) => !planned.has(c.id));
    return (q ? pool.filter((c) => c.title.toLowerCase().includes(q) || c.id.includes(q)) : pool).slice(0, 40);
  }, [query, seed, planned]);

  const close = (): void => {
    setQuery('');
    setPicked(null);
    setName('');
    setProvider('');
    setUrl('');
    setHours('20');
    setError(null);
    onClose();
  };

  const submit = async (): Promise<void> => {
    setError(null);
    const taken = new Set([...seed.resources.map((r) => r.id), ...seed.projects.map((p) => p.id), ...seed.papers.map((p) => p.id), ...seed.certs.map((c) => c.id), ...seed.plan.map((i) => i.id)]);
    const order = nextOrder(seed.plan, phaseId, block);

    if (mode === 'library') {
      if (!picked) {
        setError('Pick something from the list.');
        return;
      }
      const isResource = seed.resources.some((r) => r.id === picked);
      const planId = slugifyId(picked, taken, 'plan');
      await addCustomEntity('planItem', planId, { id: planId, phaseId, block, order, ...(isResource ? { resourceId: picked } : { projectId: picked }) });
      close();
      return;
    }

    const minutes = parseDuration(hours.includes('h') || hours.includes('m') ? hours : hours + 'h');
    if (!name.trim()) {
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
    const id = slugifyId(name, taken);
    // A link typed in by the user counts as checked by them; one left blank gets a search hint instead.
    await addCustomEntity('resource', id, {
      id,
      title: name.trim(),
      provider: provider.trim() || 'Added by you',
      type: 'course',
      url: link,
      urlVerified: link !== null,
      ...(link ? { lastVerified: today() } : { searchHint: name.trim() }),
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
    <>
      <Sheet
        open={open && !pickingTrack}
        title={title}
        onClose={close}
        footer={
          <Button variant="filled" onClick={() => void submit()}>
            Add to the lane
          </Button>
        }
      >
        <SegmentedControl
          label="What to add"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'library', label: 'From the library' },
            { value: 'new', label: 'Something new' },
          ]}
        />
        <div className="mt-4">
          {mode === 'library' ? (
            <>
              <TextField label="Search" type="search" value={query} onChange={setQuery} />
              <RowList className="mt-2" plain>
                {candidates.map((c) => (
                  <Row key={c.id} title={c.title} meta={c.sub} selected={picked === c.id} onClick={() => setPicked(c.id)} />
                ))}
                {candidates.length === 0 && <li className="py-3 text-meta text-ink2">Nothing matches that is not already planned.</li>}
              </RowList>
            </>
          ) : (
            <div className="space-y-3">
              <TextField label="Title" value={name} onChange={setName} />
              <TextField label="Provider" value={provider} onChange={setProvider} hint="Optional." />
              <TextField label="Estimated hours" type="numeric" value={hours} onChange={setHours} />
              <TextField label="Link" type="url" value={url} onChange={setUrl} hint="Leave it empty if you do not have one yet." />
              <RowList plain>
                <Row title="Track" trailing={seed.tracks.find((t) => t.id === track)?.name ?? track} onClick={() => setPickingTrack(true)} />
              </RowList>
            </div>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-meta font-medium text-ink">
            {error}
          </p>
        )}
      </Sheet>
      <PickerSheet
        open={open && pickingTrack}
        title="Track"
        searchLabel="Search tracks"
        value={track}
        options={seed.tracks.map((t) => ({ value: t.id, label: t.name, keywords: t.summary }))}
        onPick={(v) => v && setTrack(v as TrackId)}
        onClose={() => setPickingTrack(false)}
      />
    </>
  );
}
