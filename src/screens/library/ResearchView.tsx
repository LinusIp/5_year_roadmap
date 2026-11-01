import { useState } from 'react';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { isCanon, isLesser, researchAreas, SHELVES, shelfOf } from '../../lib/library-home.ts';
import { Button } from '../../ui/Button.tsx';
import { count } from '../parts/text.ts';
import { Header } from '../../ui/Header.tsx';
import { TypeTile } from '../../ui/glyphs.tsx';
import { Stars, tileDescription } from '../../ui/StarRating.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { SHELF_ICON } from './Home.tsx';

/** Rows an area shows before "Show all". */
const FIRST = 12;

const SHELF_LABEL = Object.fromEntries(SHELVES.map((s) => [s.key, s.key === 'practice' ? 'Practice' : s.label.replace(/s$/, '')]));

/**
 * Research (ATLAS-LIBRARY): year 3's reading, resources and the reading queue's papers, by area (Inference, World models, Diffusion, Generative AI), papers first
 * and the foundations (years 1 and 2) before the frontier (year 3). Each area shows twelve and opens in full.
 */
export function ResearchView({ atlas, onOpen, onOpenPaper }: { atlas: Atlas; onOpen: (refId: string) => void; onOpenPaper: (id: string) => void }) {
  const areas = researchAreas(atlas.seed, atlas.states);
  const [open, setOpen] = useState<Set<string>>(new Set());
  // The quality pass (ATLAS-QUALITY-AUDIT): an area's rows graded 3 or lower wait under "More resources", folded.
  const [lesserOpen, setLesserOpen] = useState<Set<string>>(new Set());
  const total = areas.reduce((n, a) => n + a.items.length, 0);
  return (
    <>
      <Header title="Research" sub={'Year 3 · ' + count(total) + ' to read across ' + areas.filter((a) => a.items.length > 0).length + ' areas'} back={<Button variant="icon" icon="chevronLeft" label="Back to the Library" to="/library" />} />
      {areas.map((area) => {
        const all = open.has(area.id);
        const main = area.items.filter((r) => !isLesser(r.fit.quality));
        const lesser = area.items.filter((r) => isLesser(r.fit.quality));
        const shown = all ? main : main.slice(0, FIRST);
        const lesserShown = lesserOpen.has(area.id);
        return (
          <RowList key={area.id} label={area.name + ' · ' + area.items.length} className="mt-[18px]">
            {[...shown, ...(lesserShown ? lesser : [])].map((r) => {
              const shelf = r.kind === 'paper' ? 'paper' : shelfOf(r);
              const status = r.kind === 'resource' ? atlas.states.get(r.id)?.status : undefined;
              return (
                <Row
                  key={r.id}
                  icon={<TypeTile icon={SHELF_ICON[shelf]} tone={shelf === 'paper' || shelf === 'blog' || shelf === 'practice' ? 'ice' : 'blue'} quality={r.fit.quality} />}
                  describe={tileDescription(SHELF_LABEL[shelf] ?? 'Resource', r.fit.quality)}
                  title={r.title}
                  meta={[isCanon(r.fit.quality) ? 'Canon' : null, r.fromYear ? 'Year ' + r.fromYear : null, SHELF_LABEL[shelf], r.by].filter(Boolean).join(' · ')}
                  trailing={status === 'active' ? 'Active' : status === 'done' ? 'Done' : undefined}
                  truncate
                  onClick={() => (r.kind === 'paper' ? onOpenPaper(r.id) : onOpen(r.id))}
                />
              );
            })}
            {!all && main.length > FIRST && <Row title={'Show all ' + main.length} chevron height={44} onClick={() => setOpen(new Set([...open, area.id]))} />}
            {lesser.length > 0 && !lesserShown && (all || main.length <= FIRST) && (
              <Row
                title="More resources"
                meta={
                  <span className="inline-flex items-center gap-1">
                    {count(lesser.length) + ' · '}
                    <Stars filled={3} total={3} size="sm" />
                    <span className="sr-only">3 stars</span>
                    and below
                  </span>
                }
                chevron
                height={44}
                onClick={() => setLesserOpen(new Set([...lesserOpen, area.id]))}
              />
            )}
          </RowList>
        );
      })}
    </>
  );
}
