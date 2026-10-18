import { Fragment, lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toggleUnit } from '../../db/state.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { currentPart, DOC_PARTS, flowNoun, keyNumbers } from '../../lib/doc-sections.ts';
import type { DocPart } from '../../lib/doc-sections.ts';
import { useOptimisticSet } from '../../lib/useOptimisticSet.ts';
import { loadDesign, peekDesign } from '../../seed/index.ts';
import { designBucket } from '../../seed/design-text.ts';
import type { Design } from '../../seed/design.ts';
import { Button } from '../../ui/Button.tsx';
import { Icon } from '../../ui/Icon.tsx';
import { ProgressLine } from '../../ui/ProgressLine.tsx';
import { Row } from '../../ui/Row.tsx';
import { SegmentedControl } from '../../ui/SegmentedControl.tsx';
import type { ChecklistUnit } from './Checklist.tsx';
import { Checklist } from './Checklist.tsx';
import { RunningTime } from './RunningTime.tsx';

// The diagram and its full-screen viewer load with the first doc, not with Today.
const Diagram = lazy(() => import('../../ui/Diagram.tsx').then((m) => ({ default: m.Diagram })));

/**
 * A project's design (data/projects/design/<id>.yaml); undefined while it loads, null when it has none. A design
 * whose chunk is already in memory is there on the first render, so a reopened doc draws once, at its height.
 */
export function useDesign(id: string): Design | null | undefined {
  const [design, setDesign] = useState<{ id: string; design: Design | null } | undefined>(() => {
    const peeked = id ? peekDesign(id, designBucket(id)) : null;
    return peeked === null ? undefined : { id, design: peeked ?? null };
  });
  useEffect(() => {
    let live = true;
    // A challenge has no design: nothing to load.
    if (id) void loadDesign(id).then((d) => live && setDesign({ id, design: d ?? null }));
    return () => {
      live = false;
    };
  }, [id]);
  if (!id) return null;
  return design?.id === id ? design.design : undefined;
}

/** A milestone or approach step: ticked rows count toward the project's progress. */
export interface DocStep {
  id: string;
  title: string;
  hours?: number;
}

/** A tile of the doc that is not generated from the design: a list, a line of text or Markdown. */
export interface DocExtra {
  title: string;
  items?: string[];
  text?: string;
  body?: ReactNode;
}

export interface TechDocModel {
  id: string;
  title: string;
  /** "Monthly · advanced · AI · 30 h". */
  meta: string;
  /** A weekly build's lighter doc: no stat wells, a small design. */
  light: boolean;
  /** The scenario, goal or brief: "The situation". */
  situation: string;
  /** Overview tiles after the learn chips: requirements, constraints, why, scope. */
  overviewMore?: DocExtra[];
  /** Tiles at the end of Design: stack, data. */
  designMore?: DocExtra[];
  steps: { label: 'Milestones' | 'Approach'; units: DocStep[]; hours: number };
  /** Build tiles after the watch-out: other pitfalls, parts. */
  buildMore?: DocExtra[];
  doneWhen: ChecklistUnit[];
  /** Checks tiles after Done when: ship (the deliverables), measure. */
  checksMore?: DocExtra[];
  stretch: string[];
  /** Rows under Checks: references, prerequisites. */
  related?: ReactNode;
  readme: () => string;
}

/** Flow text: `code` as a small sunken mono pill, **words** in bold. */
function FlowText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('`') ? (
          <code key={i} className="well mx-0.5 rounded-[8px] px-1.5 py-0.5 font-mono text-[0.8125rem] whitespace-nowrap">
            {p.slice(1, -1)}
          </code>
        ) : p.startsWith('**') ? (
          <strong key={i} className="font-bold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** The situation's numbers in 800 weight, so the constraints read at a glance. */
function Numbers({ text }: { text: string }) {
  return (
    <>
      {keyNumbers(text).map((p, i) =>
        p.number ? (
          <strong key={i} className="font-extrabold text-ink">
            {p.text}
          </strong>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}

function Tile({ title, aside, children, tone, className = '' }: { title?: string; aside?: ReactNode; children: ReactNode; tone?: 'ice'; className?: string }) {
  return (
    <section className={(tone === 'ice' ? 'tile well-ice' : 'tile') + ' px-[18px] py-4 ' + className}>
      {title && (
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="section-label">{title}</h3>
          {aside && <span className="text-meta font-semibold text-ink2">{aside}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

function Extra({ extra }: { extra: DocExtra }) {
  return (
    <Tile title={extra.title}>
      {extra.items && <Bullets items={extra.items} />}
      {extra.text && <p className="doc-text text-body text-ink2">{extra.text}</p>}
      {extra.body}
    </Tile>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="doc-text list-disc space-y-1 pl-5 text-body text-ink2">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}

/** Milestones as clay checkbox rows with their hours; the first one not ticked says "Now". */
function StepRows({ refId, units, done }: { refId: string; units: DocStep[]; done: string[] }) {
  const ticks = useOptimisticSet(done);
  const now = units.find((u) => !ticks.has(u.id))?.id;
  return (
    <ul className="rows">
      {units.map((unit, i) => (
        <Row
          key={unit.id}
          title={i + 1 + '. ' + unit.title}
          meta={unit.hours !== undefined ? unit.hours + ' h' : undefined}
          trailing={unit.id === now ? <span className="font-semibold text-blue-deep">Now</span> : undefined}
          check={{
            checked: ticks.has(unit.id),
            onChange: () => {
              ticks.flip(unit.id);
              void toggleUnit(refId, unit.id);
            },
            label: i + 1 + '. ' + unit.title,
          }}
        />
      ))}
    </ul>
  );
}

/** The four parts' anchors and the sticky bar that jumps between them and follows the reading. */
function useJumpBar(ready: boolean): { refs: Record<DocPart, (el: HTMLElement | null) => void>; part: DocPart; jump: (p: DocPart) => void; bar: React.RefObject<HTMLDivElement | null> } {
  const els = useRef<Partial<Record<DocPart, HTMLElement>>>({});
  const bar = useRef<HTMLDivElement>(null);
  const [part, setPart] = useState<DocPart>('overview');
  const jumping = useRef(0);

  useEffect(() => {
    const scroller = bar.current?.closest<HTMLElement>('.overflow-y-auto');
    if (!scroller) return undefined;
    let settle = 0;
    const onScroll = (): void => {
      // While a jump settles the bar keeps the chosen part; a scroll in that time is read once it ends, or a scroll
      // that stopped inside it would leave the bar on the part jumped to.
      const wait = jumping.current - Date.now();
      if (wait > 0) {
        window.clearTimeout(settle);
        settle = window.setTimeout(onScroll, wait + 16);
        return;
      }
      const base = scroller.getBoundingClientRect().top - scroller.scrollTop;
      const tops = DOC_PARTS.flatMap(({ value }) => {
        const el = els.current[value];
        return el ? [{ part: value, top: el.getBoundingClientRect().top - base }] : [];
      });
      setPart(currentPart(tops, { top: scroller.scrollTop, height: scroller.clientHeight, scrollHeight: scroller.scrollHeight }, (bar.current?.offsetHeight ?? 56) + 24));
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(settle);
      scroller.removeEventListener('scroll', onScroll);
    };
  }, [ready]);

  const jump = (p: DocPart): void => {
    const el = els.current[p];
    const scroller = bar.current?.closest<HTMLElement>('.overflow-y-auto');
    if (!el || !scroller) return;
    setPart(p);
    // The bar shows the chosen part while the scroll settles, even when the last part is too short to reach the line.
    jumping.current = Date.now() + 600;
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - (bar.current?.offsetHeight ?? 56) - 12;
    scroller.scrollTo({ top: Math.max(0, top), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const ref = (p: DocPart) => (el: HTMLElement | null) => {
    if (el) els.current[p] = el;
  };
  return { refs: { overview: ref('overview'), design: ref('design'), build: ref('build'), checks: ref('checks') }, part, jump, bar };
}

/**
 * A project's tech doc, as the "Tech doc — redesigned" board draws it: the meta line, the running timer and
 * progress, a sticky jump bar (Overview · Design · Build · Checks), then each part in raised tiles. Design is
 * generated from the structured design: the diagram, one request step by step, the components, the interface and
 * the decisions. A weekly build's doc is the same sheet with fewer parts.
 */
export function TechDoc({ atlas, model, design, done, actions }: { atlas: Atlas; model: TechDocModel; design: Design | null | undefined; done: string[]; actions?: ReactNode }) {
  const { refs, part, jump, bar } = useJumpBar(design !== undefined);
  const [stretch, setStretch] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const ticked = model.steps.units.filter((u) => done.includes(u.id));
  const hoursDone = ticked.reduce((s, u) => s + (u.hours ?? 0), 0);
  const counted = model.steps.label === 'Milestones' ? 'milestones' : 'steps';
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(model.readme());
      setCopied('Copied. Paste it into the README of the repository.');
    } catch {
      setCopied('Could not reach the clipboard. Allow it for this site and try again.');
    }
  };
  const nameOf = (id: string): string => design?.components.find((c) => c.id === id)?.name ?? id;
  const kindOf = (id: string): string => design?.components.find((c) => c.id === id)?.kind ?? 'core';
  const resource = (ref: string | undefined) => (ref ? atlas.seed.resources.find((r) => r.id === ref) : undefined);
  const stats = model.light ? [] : (design?.stats ?? []);

  // The whole doc waits for its design, so nothing is inserted above the place a reopened doc scrolls back to.
  if (design === undefined) {
    return (
      <p className="text-meta text-ink2" role="status">
        Loading the tech doc…
      </p>
    );
  }

  return (
    <div className="space-y-[18px]">
      <div>
        <p className="text-meta text-ink2">{model.meta}</p>
        <div className="mt-2 flex min-h-8 items-center gap-3">
          <RunningTime atlas={atlas} refId={model.id} pill />
          <span className="ml-auto text-meta text-ink2">{ticked.length + ' of ' + model.steps.units.length + ' ' + counted}</span>
        </div>
      </div>

      <div ref={bar} className="sticky -top-2 z-10 -mx-5 bg-bg px-5 pb-2 pt-2">
        <SegmentedControl label="Jump to a part of the doc" options={[...DOC_PARTS]} value={part} onChange={jump} />
      </div>

      {/* Overview */}
      <div ref={refs.overview} className="space-y-[18px]" aria-labelledby={'doc-overview-' + model.id} role="region">
        <h3 id={'doc-overview-' + model.id} className="sr-only">
          Overview
        </h3>
        <Tile title="The situation">
          <p className="doc-text text-body text-ink2">
            <Numbers text={model.situation} />
          </p>
        </Tile>
        {design && (
          <Tile title="What you’ll build">
            <p className="doc-text text-body text-ink2">{design.overview}</p>
          </Tile>
        )}
        {stats.length > 0 && (
          <ul className="grid gap-3" style={{ gridTemplateColumns: 'repeat(' + stats.length + ', minmax(0, 1fr))' }}>
            {stats.map((s, i) => (
              <li key={s.label} className={'well rounded-box px-3 py-3 ' + (i % 2 === 0 ? 'well-blue' : 'well-ice')}>
                <span className="block text-[1.25rem] font-extrabold leading-tight text-ink">{s.value}</span>
                <span className="mt-0.5 block text-small text-ink2">{s.label}</span>
              </li>
            ))}
          </ul>
        )}
        {design && design.learn.length > 0 && (
          <Tile title="You’ll learn">
            <ul className="flex flex-wrap gap-2">
              {design.learn.map((l) => {
                const r = resource(l.ref);
                return (
                  <li key={l.name}>
                    {r ? (
                      <Button size="sm" to={'/library/' + r.id} icon="book">
                        {l.name}
                      </Button>
                    ) : (
                      <span className="well inline-flex min-h-11 items-center rounded-pill px-4 text-chip text-ink2">{l.name}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Tile>
        )}
        {model.overviewMore?.map((m) => (
          <Extra key={m.title} extra={m} />
        ))}
      </div>

      {/* Design */}
      <div ref={refs.design} className="space-y-[18px]" role="region" aria-labelledby={'doc-design-' + model.id}>
        <h3 id={'doc-design-' + model.id} className="sr-only">
          Design
        </h3>
        {design === null ? (
          <p className="text-meta text-ink2">This project has no design yet.</p>
        ) : (
          <>
            <Tile title="How it works">
              <Suspense fallback={<p className="text-meta text-ink2">Drawing the diagram…</p>}>
                <Diagram design={design} title={model.title} />
              </Suspense>
            </Tile>
            <Tile title={'One ' + flowNoun([...design.flow.map((f) => f.text), design.overview]) + ', step by step'} className="pb-1">
              <ol className="rows">
                {design.flow.map((step, i) => (
                  <li key={i} className="flex gap-3 py-3">
                    <span aria-hidden="true" className={'grid size-7 shrink-0 place-items-center rounded-pill text-small font-bold ' + (kindOf(step.component) === 'core' ? 'fill-blue' : 'fill-ice')}>
                      {i + 1}
                    </span>
                    <p className="doc-text min-w-0 text-body">
                      <span className="sr-only">{'Step ' + (i + 1) + ': '}</span>
                      <strong className="font-bold">{nameOf(step.component)}</strong> <FlowText text={step.text} />
                    </p>
                  </li>
                ))}
              </ol>
            </Tile>
            <Tile title="Components" className="pb-1">
              <ul className="rows">
                {design.components.map((c) => (
                  <li key={c.id} className="py-3">
                    <p className="flex items-baseline justify-between gap-3">
                      <span className="text-body font-semibold">{c.name}</span>
                      <span className="shrink-0 text-right text-meta text-ink2">{c.tech}</span>
                    </p>
                    <p className="mt-0.5 text-meta text-ink2">
                      {c.role}
                      {c.kind !== 'core' && <span className="sr-only">{' (' + c.kind + ')'}</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </Tile>
            {design.interface && (
              <Tile title="Interface">
                <pre tabIndex={0} aria-label={'Interface, ' + design.interface.lang} className="well overflow-x-auto rounded-box px-4 py-3 font-mono text-[0.8125rem] leading-relaxed">
                  <code>{design.interface.code.replace(/\n$/, '')}</code>
                </pre>
              </Tile>
            )}
            <Tile title="Key decisions" className="pb-1">
              <ul className="rows">
                {design.decisions.map((d) => (
                  <li key={d.choice} className="py-3">
                    <p className="text-body font-semibold">{d.choice}</p>
                    <p className="mt-0.5 text-meta text-ink2">{d.why}</p>
                    {!d.choice.toLowerCase().includes(d.instead.toLowerCase().replace(/^an? /, '')) && <p className="mt-0.5 text-meta text-ink2">{'Instead of: ' + d.instead}</p>}
                  </li>
                ))}
              </ul>
            </Tile>
          </>
        )}
        {model.designMore?.map((m) => (
          <Extra key={m.title} extra={m} />
        ))}
      </div>

      {/* Build */}
      <div ref={refs.build} className="space-y-[18px]" role="region" aria-labelledby={'doc-build-' + model.id}>
        <h3 id={'doc-build-' + model.id} className="sr-only">
          Build
        </h3>
        <Tile title={model.steps.label} aside={model.steps.hours > 0 ? hoursDone + ' of ' + model.steps.hours + ' h' : ticked.length + ' of ' + model.steps.units.length} className="pb-1">
          <div className="mb-1">
            <ProgressLine value={model.steps.units.length ? ticked.length / model.steps.units.length : 0} label={model.steps.label + ' of ' + model.title} />
          </div>
          <StepRows refId={model.id} units={model.steps.units} done={done} />
        </Tile>
        {design && (
          <section className="tile well-ice flex gap-3 px-[18px] py-4">
            <span className="text-ice-deep">
              <Icon name="zap" size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="section-label mb-1">Watch out</h3>
              <p className="doc-text text-body">{design.watchOut}</p>
            </div>
          </section>
        )}
        {model.buildMore?.map((m) => (
          <Extra key={m.title} extra={m} />
        ))}
      </div>

      {/* Checks */}
      <div ref={refs.checks} className="space-y-[18px]" role="region" aria-labelledby={'doc-checks-' + model.id}>
        <h3 id={'doc-checks-' + model.id} className="sr-only">
          Checks
        </h3>
        {model.doneWhen.length > 0 && <Checklist label="Done when" refId={model.id} units={model.doneWhen} done={done} />}
        {model.checksMore?.map((m) => (
          <Extra key={m.title} extra={m} />
        ))}
        {model.stretch.length > 0 && (
          <section className="tile px-[18px] py-1">
            <button type="button" aria-expanded={stretch} onClick={() => setStretch(!stretch)} className="flex min-h-14 w-full items-center gap-3 text-left">
              <span className="min-w-0 flex-1 text-body font-medium">Stretch</span>
              <span className="text-meta text-ink2">{model.stretch.length}</span>
              <Icon name={stretch ? 'chevronDown' : 'chevronRight'} size={18} className="text-ink2" />
            </button>
            {stretch && (
              <div className="pb-3">
                <Bullets items={model.stretch} />
              </div>
            )}
          </section>
        )}
        {model.related}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" icon="doc" onClick={() => void copy()}>
            README skeleton
          </Button>
          {actions}
        </div>
        {copied && (
          <p role="status" className="text-meta text-ink2">
            {copied}
          </p>
        )}
      </div>
    </div>
  );
}
