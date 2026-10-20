import { useState } from 'react';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { researchAreas, SHELVES, shelfOf } from '../../lib/library-home.ts';
import { Button } from '../../ui/Button.tsx';
import { Header } from '../../ui/Header.tsx';
import { IconTile } from '../../ui/glyphs.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { SHELF_ICON } from './Home.tsx';

/** Rows an area shows before "Show all". */
const FIRST = 12;

const SHELF_LABEL = Object.fromEntries(SHELVES.map((s) => [s.key, s.key === 'practice' ? 'Practice' : s.label.replace(/s$/, '')]));

/**
 * Research (ATLAS-LIBRARY): year 3's reading, by area (Inference, World models, Diffusion, Generative AI), papers first
 * and the foundations (years 1 and 2) before the frontier (year 3). Each area shows twelve and opens in full.
 */
export function ResearchView({ atlas, onOpen }: { atlas: Atlas; onOpen: (refId: string) => void }) {
  const areas = researchAreas(atlas.seed, atlas.states);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const total = areas.reduce((n, a) => n + a.items.length, 0);
  return (
    <>
      <Header title="Research" sub={'Year 3 · ' + total + ' to read across ' + areas.filter((a) => a.items.length > 0).length + ' areas'} back={<Button variant="icon" icon="chevronLeft" label="Back to the Library" to="/library" />} />
      {areas.map((area) => {
        const all = open.has(area.id);
        const shown = all ? area.items : area.items.slice(0, FIRST);
        return (
          <RowList key={area.id} label={area.name + ' · ' + area.items.length} className="mt-[18px]">
            {shown.map((r) => {
              const shelf = shelfOf(r);
              const status = atlas.states.get(r.id)?.status;
              return (
                <Row
                  key={r.id}
                  icon={<IconTile icon={SHELF_ICON[shelf]} tone={shelf === 'paper' || shelf === 'blog' || shelf === 'practice' ? 'ice' : 'blue'} />}
                  title={r.short ?? r.title}
                  meta={[r.fromYear ? 'Year ' + r.fromYear : null, SHELF_LABEL[shelf], r.provider].filter(Boolean).join(' · ')}
                  trailing={status === 'active' ? 'Active' : status === 'done' ? 'Done' : undefined}
                  truncate
                  onClick={() => onOpen(r.id)}
                />
              );
            })}
            {!all && area.items.length > FIRST && <Row title={'Show all ' + area.items.length} chevron height={44} onClick={() => setOpen(new Set([...open, area.id]))} />}
          </RowList>
        );
      })}
    </>
  );
}
