import { toggleRoadmapNode } from '../../db/state.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { MASTERED_SHARE } from '../../lib/roadmaps.ts';
import type { RoadmapCoverage } from '../../lib/roadmaps.ts';
import { Button } from '../../ui/Button.tsx';
import { ProgressLine } from '../../ui/ProgressLine.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { plural } from '../parts/text.ts';

const PRIORITY = { 1: 'Priority 1', 2: 'Priority 2', 3: 'Priority 3, as graphics' } as const;

function status(c: RoadmapCoverage): string {
  if (c.mastered) return 'Mastered';
  return PRIORITY[c.roadmap.priority] + ' · ' + c.requiredChecked + ' of ' + plural(c.required, 'node');
}

/** The five roadmap.sh roadmaps as lane-like rows: a percent, a line, and a sheet of their nodes. */
export function RoadmapsList({ coverage, onOpen }: { coverage: RoadmapCoverage[]; onOpen: (id: string) => void }) {
  return (
    <section>
      <h2 className="mb-1.5 text-meta font-normal text-ink2">Roadmaps</h2>
      <ul className="rounded-card bg-surface px-4">
        {coverage.map((c, i) => (
          <li key={c.roadmap.id}>
            <button
              type="button"
              onClick={() => onOpen(c.roadmap.id)}
              className={'flex w-full flex-col gap-1.5 py-3.5 text-left' + (i > 0 ? ' border-t border-line' : '')}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-body font-medium leading-[1.3]">{c.roadmap.title}</span>
                <span className="shrink-0 text-meta text-ink2">{c.percent} %</span>
              </span>
              <span className="text-meta leading-[1.3] text-ink2">{status(c)}</span>
              <ProgressLine value={c.percent / 100} label={c.roadmap.title + ' coverage'} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One roadmap's nodes by section, each section with the phase that teaches it. */
export function RoadmapSheet({ atlas, coverage, onClose }: { atlas: Atlas; coverage: RoadmapCoverage | null; onClose: () => void }) {
  const c = coverage;
  const target = c ? Math.ceil(c.required * MASTERED_SHARE) : 0;
  return (
    <Sheet open={c !== null} title={c?.roadmap.title ?? ''} onClose={onClose}>
      {c && (
        <div key={c.roadmap.id} className="space-y-6">
          <div className="space-y-2">
            <p className="text-meta text-ink2">
              {c.percent} % · {c.requiredChecked} of {plural(c.required, 'node')}, optional ones left out
            </p>
            <ProgressLine value={c.percent / 100} label={c.roadmap.title + ' coverage'} />
            <p className="text-body text-ink2">
              {c.mastered
                ? 'Mastered: ' + Math.round(MASTERED_SHARE * 100) + ' % of the nodes and the ' + c.subjectTitle + ' row of the credential map are done.'
                : 'Mastered at ' + target + ' nodes with the ' + c.subjectTitle + ' row of the credential map done (' + (c.rowDone ? 'it is' : 'not yet') + '). Finishing an item that covers a node ticks it.'}
            </p>
            {c.roadmap.note && <p className="text-meta text-ink2">{c.roadmap.note}</p>}
            <div className="pt-1">
              <Button href={c.roadmap.url} icon="external">
                roadmap.sh
              </Button>
            </div>
          </div>
          {c.roadmap.sections.map((section) => {
            const phase = atlas.seed.phases.find((p) => p.id === section.phaseId);
            const done = section.nodes.filter((n) => c.checked.has(n.id)).length;
            return (
              <RowList
                key={section.title}
                label={
                  <span className="flex justify-between gap-3">
                    <span>{section.title + (phase ? ' · Year ' + phase.year : '')}</span>
                    <span>
                      {done} of {section.nodes.length}
                    </span>
                  </span>
                }
              >
                {section.nodes.map((node) => {
                  const by = c.coveredBy.get(node.id);
                  return (
                    <Row
                      key={node.id}
                      height={44}
                      plainTitle
                      title={node.label}
                      meta={by ? 'From ' + by.join(', ') : node.optional ? 'Optional' : undefined}
                      check={{ checked: c.checked.has(node.id), disabled: Boolean(by), onChange: () => void toggleRoadmapNode(c.roadmap.id, node.id) }}
                    />
                  );
                })}
              </RowList>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
