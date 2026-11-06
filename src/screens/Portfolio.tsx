/**
 * The portfolio (ATLAS-PORTFOLIO): the nine flagship projects for the 2027–28 internship applications, in a section of
 * their own. `#/portfolio` lists them (focus tile and countdown, the timeline strip, a card each); `#/portfolio/<id>`
 * is one project (Overview · Tech doc · Ship). Nothing here reads or writes the plan's projects, the Internships
 * screen's or the Library's project shelves: the data is its own chunk and the progress its own table.
 */
import { useMemo, useState } from 'react';
import { usePaperStates } from '../db/state.ts';
import { setPortfolioNotes, setPortfolioRepo, setPortfolioStatus, setTick, usePortfolioStates } from '../db/portfolio.ts';
import { startTimer, useRunningTimer } from '../db/timer.ts';
import type { PortfolioState } from '../db/types.ts';
import { useAtlas, useLibrary } from '../hooks/useAtlas.ts';
import type { Atlas } from '../hooks/useAtlas.ts';
import { usePortfolio } from '../hooks/usePortfolio.ts';
import { today as todayDate } from '../lib/dates.ts';
import { Markdown } from '../lib/markdown.tsx';
import {
  allDoneWhen, cycleStatus, daysToEvent, hoursDone, isOverrun, isRepoUrl, portfolioLabel, portfolioRef, portfolioTrack, progressLine, progressOf, repoName, shipCount, statusLabel, statusOf,
  tickedMilestones, timelineOf, windowLabel,
} from '../lib/portfolio.ts';
import { parseDoc, readmeSkeleton } from '../lib/project-doc.ts';
import type { ProjectDoc } from '../lib/project-doc.ts';
import { useQueryParam } from '../router/router.tsx';
import type { PortfolioProject, PortfolioSeed, PortfolioStatus } from '../seed/portfolio.ts';
import { Button } from '../ui/Button.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { FadeStrip } from '../ui/FadeStrip.tsx';
import { IconTile, TypeTile } from '../ui/glyphs.tsx';
import { Header } from '../ui/Header.tsx';
import { Icon } from '../ui/Icon.tsx';
import { ProgressLine } from '../ui/ProgressLine.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import { tileDescription } from '../ui/StarRating.tsx';
import { TextField } from '../ui/TextField.tsx';
import { SHELF_ICON } from './library/Home.tsx';
import { shelfOf } from '../lib/library-home.ts';
import { ItemSheet } from './parts/ItemSheet.tsx';
import { LogTimeSheet } from './parts/LogTimeSheet.tsx';
import { TechDoc } from './parts/TechDoc.tsx';
import type { TechDocModel } from './parts/TechDoc.tsx';
import { plural } from './parts/text.ts';
import { PaperSheet } from './plan/PapersView.tsx';

/** The label every portfolio card and page wears, so these never read as plan projects. */
function PortfolioMark({ className = '' }: { className?: string }) {
  return (
    <span className={'inline-flex items-center gap-1 text-small font-semibold uppercase tracking-[0.04em] text-[var(--x2)] ' + className}>
      <Icon name="trophy" size={14} />
      Portfolio
    </span>
  );
}

function StatusButton({ project, status }: { project: PortfolioProject; status: PortfolioStatus }) {
  return (
    <Button size="sm" className="shrink-0" name={'Status of ' + project.code + ': ' + statusLabel(status) + '. Tap for the next'} onClick={() => void setPortfolioStatus(project.id, cycleStatus(status))}>
      {statusLabel(status)}
    </Button>
  );
}

function Chip({ children }: { children: string }) {
  return <li className="well rounded-pill px-3 py-1 text-small font-medium text-ink2">{children}</li>;
}

/* ------------------------------------------------------------------ the timeline strip */

const MONTH_W = 44;
const ROW_H = 44;

function Timeline({ portfolio, today }: { portfolio: PortfolioSeed; today: string }) {
  const model = useMemo(() => timelineOf(portfolio, today), [portfolio, today]);
  const [picked, setPicked] = useState<{ project: string; bar: number } | null>(null);
  const width = model.months.length * MONTH_W;
  const pickedRow = picked ? model.rows.find((r) => r.project.id === picked.project) : undefined;
  const pickedBar = pickedRow?.bars[picked!.bar];
  return (
    <section aria-labelledby="portfolio-timeline" className="tile px-[18px] py-4">
      <h2 id="portfolio-timeline" className="section-label">
        {'Timeline · ' + windowLabel({ schedule: [{ from: model.months[0]!, to: model.months[model.months.length - 1]!, what: '' }] })}
      </h2>
      <div className="flex">
        <ul className="w-[92px] shrink-0 pt-[28px]" aria-hidden="true">
          {model.rows.map((r) => (
            <li key={r.project.id} className="flex items-center truncate pr-2 text-small font-semibold" style={{ height: ROW_H }}>
              {r.project.number + ' · ' + r.project.code}
            </li>
          ))}
        </ul>
        <FadeStrip open="current" className="min-w-0 flex-1">
          <div className="relative" style={{ width }}>
            <ol className="flex h-[28px] items-end" aria-hidden="true">
              {model.months.map((m, i) => (
                <li key={m} className="shrink-0 text-center text-[11px] font-semibold text-ink2" style={{ width: MONTH_W }} {...(model.today !== null && Math.floor(model.today) === i ? { 'aria-current': 'date' } : {})}>
                  {m.slice(5) === '01' || i === 0 ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m.slice(5)) - 1] + " '" + m.slice(2, 4) : ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][Number(m.slice(5)) - 1]}
                </li>
              ))}
            </ol>
            <ul>
              {model.rows.map((r) => (
                <li key={r.project.id} className="relative" style={{ height: ROW_H }}>
                  {r.bars.map((b, i) => {
                    const on = picked?.project === r.project.id && picked.bar === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        aria-pressed={on}
                        aria-label={r.project.code + ', ' + b.label + ': ' + b.what}
                        onClick={() => setPicked(on ? null : { project: r.project.id, bar: i })}
                        className="absolute top-0 flex items-center px-[3px]"
                        style={{ left: b.from * MONTH_W, width: (b.to - b.from + 1) * MONTH_W, height: ROW_H }}
                      >
                        <span className={'block h-[18px] w-full rounded-pill ' + (r.project.core ? 'fill-blue' : 'fill-ice') + (on ? ' outline outline-2 outline-offset-1 outline-ink' : '')} />
                      </button>
                    );
                  })}
                </li>
              ))}
            </ul>
            {model.today !== null && <span aria-hidden="true" data-today-line className="pointer-events-none absolute bottom-0 top-[24px] w-[2px] rounded-pill bg-ink" style={{ left: model.today * MONTH_W }} />}
            {model.events.map((e) => (
              <span key={e.date} aria-hidden="true" data-event-diamond title={e.title} className="pointer-events-none absolute top-[17px] size-[10px] rotate-45 bg-[var(--x1)]" style={{ left: e.index * MONTH_W + MONTH_W / 2 - 5 }} />
            ))}
          </div>
        </FadeStrip>
      </div>
      <p role="status" className="mt-2 min-h-[2.5em] text-meta text-ink2">
        {pickedRow && pickedBar ? <><strong className="font-semibold text-ink">{pickedRow.project.code + ' · ' + pickedBar.label + ':'}</strong> {pickedBar.what}</> : 'Tap a bar for what that window is for. The line is today; the diamond, the application date.'}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ the list */

function ProjectCard({ project, state, today, overrunRule }: { project: PortfolioProject; state: PortfolioState | undefined; today: string; overrunRule: string }) {
  const status = statusOf(project, state, today);
  const value = progressOf(project, state);
  return (
    <section aria-labelledby={'portfolio-card-' + project.id} data-portfolio-card={project.id} className="tile flex flex-col gap-2.5 p-[18px]">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="well grid size-11 shrink-0 place-items-center rounded-[12px] text-lead font-black text-[var(--x2)]">
          {project.number}
        </span>
        <div className="min-w-0 flex-1">
          <PortfolioMark />
          <h2 id={'portfolio-card-' + project.id} className="text-body font-semibold leading-tight">
            <a href={'#/portfolio/' + project.id} className="flex min-h-11 items-center underline-offset-2 hover:underline">
              <span className="sr-only">{'Portfolio project ' + project.number + ': '}</span>
              {project.title}
            </a>
          </h2>
          <p className="text-meta text-ink2">{windowLabel(project)}</p>
        </div>
        <StatusButton project={project} status={status} />
      </div>
      {project.core && (
        <p>
          <span className="well well-blue inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-small font-semibold text-blue-deep">
            <Icon name="star" size={12} />
            Core for 2027
          </span>
        </p>
      )}
      <p className="text-meta">
        <span className="section-label mb-0 mr-1.5 inline">Proves</span>
        {project.proves}
      </p>
      <ul className="flex flex-wrap gap-1.5" aria-label="Stack">
        {project.stack.map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
      </ul>
      <div className="flex items-center gap-2.5">
        <div className="flex-1">
          <ProgressLine value={value} label={project.code + ' progress'} lane={2} size={12} />
        </div>
        <span className="text-meta text-ink2 tabular-nums">{hoursDone(project, state) + ' of ' + project.estHours + ' h'}</span>
      </div>
      {isOverrun(project, status, today) && (
        <p className="well well-ice rounded-box px-3 py-2 text-meta" data-overrun>
          {overrunRule}
        </p>
      )}
    </section>
  );
}

function PortfolioList({ portfolio, states, today }: { portfolio: PortfolioSeed; states: Map<string, PortfolioState>; today: string }) {
  const projects = [...portfolio.projects].sort((a, b) => a.number - b.number);
  const event = portfolio.events[0];
  const days = event ? daysToEvent(event, today) : null;
  return (
    <>
      <section aria-labelledby="portfolio-focus" className="tile mt-4 flex flex-col gap-2 p-[18px]">
        {event && days !== null && (
          <p className="flex items-baseline gap-2">
            <span className="text-[40px] font-black leading-none text-[var(--x2)] tabular-nums">{Math.max(0, days)}</span>
            <span className="text-body font-semibold">{(days === 1 ? 'day' : 'days') + ' to ' + (days < 0 ? 'the application date (passed)' : 'the application date')}</span>
          </p>
        )}
        {event && <p className="text-meta text-ink2">{event.title}</p>}
        <h2 id="portfolio-focus" className="section-label mb-0 mt-1">
          Focus
        </h2>
        <p className="text-body">{portfolio.focus_note}</p>
      </section>
      <Timeline portfolio={portfolio} today={today} />
      <div className="flex flex-col gap-4">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} state={states.get(p.id)} today={today} overrunRule={portfolio.overrun_rule} />
        ))}
      </div>
      <p className="text-meta text-ink2">{portfolio.time_note}</p>
      <RowList flat>
        <Row title="Portfolio Projects 2027" meta={'The source doc, in Claude · ' + (portfolio.source_doc.note ?? '')} metaWraps href={portfolio.source_doc.url} icon={<IconTile icon="doc" tone="neutral" />} />
      </RowList>
    </>
  );
}

/* ------------------------------------------------------------------ one project */

type Tab = 'overview' | 'doc' | 'ship';
const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'doc', label: 'Tech doc' },
  { value: 'ship', label: 'Ship' },
];

/** The doc's milestones carry the file's ids, so a tick in the doc and one on the page are the same tick. */
function portfolioDocModel(project: PortfolioProject, doc: ProjectDoc, atlas: Atlas, onOpen: (kind: 'resource' | 'paper', id: string) => void): TechDocModel {
  const md = (source: string | undefined) => (source ? <Markdown source={source} className="doc-text text-body text-ink2" /> : undefined);
  const extra = (title: string, section: keyof ProjectDoc['sections'], as = title) => (doc.sections[section] ? [{ title: as, body: md(doc.sections[section]) }] : []);
  const plain = (s: string): string => s.replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim();
  return {
    id: portfolioRef(project.id),
    title: project.title,
    meta: 'Portfolio · project ' + project.number + ' · ' + project.weeks + ' weeks · ' + project.estHours + ' h',
    light: false,
    situation: plain(doc.sections.Goal ?? project.summary),
    overviewMore: [...extra('Why', 'Why'), ...extra('Scope', 'Scope')],
    designMore: extra('Stack', 'Stack'),
    steps: { label: 'Milestones', units: project.milestones.map((m) => ({ id: m.id, title: m.title, hours: m.hours })), hours: project.estHours },
    buildMore: extra('Pitfalls', 'Pitfalls'),
    doneWhen: project.done_when.map((d) => ({ id: d.id, title: d.text })),
    checksMore: [...extra('Measure', 'Measure and report'), ...extra('Write-up', 'Write-up')],
    stretch: [],
    related:
      doc.references.length > 0 ? (
        <RowList label="References">
          {doc.references.map((id) => {
            const r = atlas.seed.resources.find((x) => x.id === id);
            const p = r ? undefined : atlas.seed.papers.find((x) => x.id === id);
            return <Row key={id} title={r?.title ?? p?.title ?? id} meta={r ? (r.provider ?? 'Resource') : p ? 'Paper' + (p.year ? ' · ' + p.year : '') : 'Reference'} onClick={r ? () => onOpen('resource', id) : p ? () => onOpen('paper', id) : undefined} />;
          })}
        </RowList>
      ) : undefined,
    readme: () => readmeSkeleton(doc),
  };
}

function ReadFirst({ project, atlas, onOpen }: { project: PortfolioProject; atlas: Atlas; onOpen: (kind: 'resource' | 'paper', id: string) => void }) {
  return (
    <RowList label="Read first" className="mt-4">
      {project.read_first.map((item) => {
        const r = item.library_id ? atlas.seed.resources.find((x) => x.id === item.library_id) : undefined;
        const p = !r && item.library_id ? atlas.seed.papers.find((x) => x.id === item.library_id) : undefined;
        if (r) {
          const shelf = shelfOf(r);
          return (
            <Row
              key={item.title}
              icon={<TypeTile icon={SHELF_ICON[shelf]} tone={shelf === 'practice' || shelf === 'paper' || shelf === 'blog' ? 'ice' : 'blue'} quality={r.quality} />}
              describe={tileDescription(shelf === 'paper' ? 'Paper' : 'Resource', r.quality)}
              title={r.short ?? r.title}
              meta={r.provider ?? undefined}
              truncate
              onClick={() => onOpen('resource', r.id)}
            />
          );
        }
        if (p) return <Row key={item.title} icon={<TypeTile icon="paper" tone="ice" quality={p.quality} />} describe={tileDescription('Paper', p.quality)} title={p.short ?? p.title} meta={'Paper' + (p.year ? ' · ' + p.year : '')} truncate onClick={() => onOpen('paper', p.id)} />;
        return <Row key={item.title} icon={<IconTile icon="external" tone="neutral" />} title={item.title} meta="Not in the Library · opens the page" href={item.url} />;
      })}
    </RowList>
  );
}

function Overview({ portfolio, project, state, atlas, today, onOpen }: { portfolio: PortfolioSeed; project: PortfolioProject; state: PortfolioState | undefined; atlas: Atlas; today: string; onOpen: (kind: 'resource' | 'paper', id: string) => void }) {
  const status = statusOf(project, state, today);
  const ticked = new Set(state?.milestones ?? []);
  const doneWhen = new Set(state?.doneWhen ?? []);
  const roles = project.roles.map((req) => portfolio.roles.find((r) => r.req === req)).filter((r) => r !== undefined);
  const value = progressOf(project, state);
  return (
    <>
      <section className="tile mt-4 flex flex-col gap-2.5 p-[18px]">
        <p className="text-body">{project.summary}</p>
        <h2 className="section-label mb-0 mt-1">Why it stands out</h2>
        <p className="text-meta">{project.why}</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Stack">
          {project.stack.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </ul>
        <p className="text-meta text-ink2">{windowLabel(project) + ' · ' + project.weeks + ' weeks · ' + project.estHours + ' h' + (project.core ? ' · Core for 2027' : '')}</p>
        {project.hardware_note && <p className="well well-ice rounded-box px-3 py-2 text-meta">{project.hardware_note}</p>}
        {isOverrun(project, status, today) && <p className="well well-ice rounded-box px-3 py-2 text-meta">{portfolio.overrun_rule}</p>}
      </section>

      {roles.length > 0 && (
        <section aria-labelledby="portfolio-roles" className="tile mt-4 flex flex-col gap-2 p-[18px]">
          <h2 id="portfolio-roles" className="section-label mb-0">
            Roles
          </h2>
          <ul className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <li key={r.req}>
                {r.url ? (
                  <Button size="sm" href={r.url} icon="external" name={r.req + ': ' + r.title + ' (opens the posting)'}>
                    {r.req}
                  </Button>
                ) : (
                  <span className="well inline-flex min-h-11 items-center rounded-pill px-4 text-chip text-ink2" title={r.note ?? r.title}>
                    {r.req}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-small text-ink2">Postings change often; re-check before applying.</p>
        </section>
      )}

      <RowList label="Milestones" className="mt-4" aside={hoursDone(project, state) + ' of ' + project.estHours + ' h'}>
        <li className="pb-2 pt-1">
          <ProgressLine value={value} label={'Milestones of ' + project.code} lane={2} size={12} />
        </li>
        {project.milestones.map((m, i) => (
          <Row
            key={m.id}
            title={i + 1 + '. ' + m.title + (m.stretch && !/stretch/i.test(m.title) ? ' · Stretch' : '')}
            meta={
              <>
                {m.detail + ' · ' + m.hours + ' h'}
                {m.examples && (
                  <ul className="mt-1 list-disc pl-5">
                    {m.examples.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                )}
              </>
            }
            metaWraps
            check={{ checked: ticked.has(m.id), onChange: (on) => void setTick(project.id, 'milestones', m.id, on), label: i + 1 + '. ' + m.title }}
          />
        ))}
      </RowList>

      <RowList label="Done when" className="mt-4" aside={project.done_when.filter((d) => doneWhen.has(d.id)).length + ' of ' + project.done_when.length}>
        {project.done_when.map((d) => (
          <Row key={d.id} title={d.text} plainTitle metaWraps check={{ checked: doneWhen.has(d.id), onChange: (on) => void setTick(project.id, 'doneWhen', d.id, on), label: d.text }} />
        ))}
      </RowList>
      {allDoneWhen(project, state) && status !== 'done' && (
        <section className="tile well-ice mt-3 flex flex-wrap items-center gap-3 p-[18px]" aria-live="polite">
          <p className="min-w-0 flex-1 text-body font-semibold">Every check is ticked. Mark {project.code} done?</p>
          <Button size="sm" onClick={() => void setPortfolioStatus(project.id, 'done')}>
            Mark done
          </Button>
        </section>
      )}

      <ReadFirst project={project} atlas={atlas} onOpen={onOpen} />

      {project.related.length > 0 && (
        <RowList label="Also in Atlas" className="mt-4">
          {project.related.map((rel) => (
            <Row key={rel.where + rel.id} height={48} title={rel.title} meta={rel.where === 'internships' ? 'Internships · a project of its own' : 'Plan · a project of its own'} to={rel.where === 'internships' ? '/internships?tab=projects' : '/library/' + rel.id} chevron />
          ))}
        </RowList>
      )}
    </>
  );
}

function Ship({ portfolio, project, state }: { portfolio: PortfolioSeed; project: PortfolioProject; state: PortfolioState | undefined }) {
  const shipped = new Set(state?.ship ?? []);
  const [repo, setRepo] = useState(state?.repo ?? '');
  const [repoError, setRepoError] = useState<string | null>(null);
  const [notes, setNotes] = useState(state?.notes ?? '');
  const saveRepo = (): void => {
    const value = repo.trim();
    if (!value) {
      setRepoError(null);
      void setPortfolioRepo(project.id, null);
    } else if (!isRepoUrl(value)) setRepoError('A repository is https://github.com/owner/repo.');
    else {
      setRepoError(null);
      void setPortfolioRepo(project.id, value);
    }
  };
  return (
    <>
      <RowList label="Ship checklist" className="mt-4" aside={shipCount(portfolio.rules, state) + ' of ' + portfolio.rules.length + ' shipped'}>
        {portfolio.rules.map((rule) => (
          <Row key={rule.id} title={rule.title} meta={rule.detail} metaWraps check={{ checked: shipped.has(rule.id), onChange: (on) => void setTick(project.id, 'ship', rule.id, on), label: rule.title }} />
        ))}
      </RowList>
      <p className="mt-3 text-meta text-ink2">{portfolio.habits}</p>
      <section aria-labelledby="portfolio-repo" className="tile mt-4 flex flex-col gap-3 p-[18px]">
        <h2 id="portfolio-repo" className="section-label mb-0">
          Repository and notes
        </h2>
        <TextField label="GitHub repository" value={repo} onChange={(v) => { setRepo(v); setRepoError(null); }} onBlur={saveRepo} onKeyDown={(e) => e.key === 'Enter' && saveRepo()} error={repoError} hint="https://github.com/owner/repo" autoComplete="url" />
        {state?.repo && (
          <Button size="sm" href={state.repo} icon="external" className="self-start">
            {repoName(state.repo)}
          </Button>
        )}
        <TextField label="Notes" value={notes} onChange={setNotes} onBlur={() => void setPortfolioNotes(project.id, notes)} multiline rows={4} />
      </section>
    </>
  );
}

function ProjectPage({ portfolio, project, states, atlas, today }: { portfolio: PortfolioSeed; project: PortfolioProject; states: Map<string, PortfolioState>; atlas: Atlas; today: string }) {
  const state = states.get(project.id);
  const status = statusOf(project, state, today);
  const [tabParam, setTab] = useQueryParam('tab');
  const [itemParam, setItem] = useQueryParam('item');
  const [paperParam, setPaper] = useQueryParam('paper');
  const [logging, setLogging] = useState(false);
  const paperStates = usePaperStates();
  const timer = useRunningTimer();
  const tab: Tab = TABS.some((t) => t.value === tabParam) ? (tabParam as Tab) : 'overview';
  const doc = useMemo(() => (portfolio.docs[project.id] ? parseDoc(portfolio.docs[project.id]!).doc : null), [portfolio, project.id]);
  const design = portfolio.designs[project.id] ?? null;
  const onOpen = (kind: 'resource' | 'paper', id: string): void => (kind === 'resource' ? setItem(id, { replace: false }) : setPaper(id, { replace: false }));
  const block = atlas.settings.core.blocks.find((b) => b.id === 'D')?.id ?? atlas.settings.core.blocks[0]!.id;
  const track = portfolioTrack(project.track);
  const running = timer?.refId === portfolioRef(project.id);
  const done = [...(state?.milestones ?? []), ...(state?.doneWhen ?? [])];
  const milestoneIds = new Set(project.milestones.map((m) => m.id));
  return (
    <>
      <Header title={project.code} backTo="/portfolio" backLabel="Back to Portfolio" sub={<><PortfolioMark className="mr-1.5" />{'Project ' + project.number + ' · ' + statusLabel(status) + ' · ' + tickedMilestones(project, state).length + ' of ' + project.milestones.length + ' milestones'}</>} />
      <p className="mt-2 text-lead font-semibold leading-snug">{project.title}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <Button variant="filled" icon="clock" onClick={() => setLogging(true)}>
          Log time
        </Button>
        <Button icon={running ? 'clock' : 'play'} onClick={() => void startTimer({ block, track, refId: portfolioRef(project.id), note: portfolioLabel(project.code) })} disabled={running}>
          {running ? 'Timer running' : 'Start timer'}
        </Button>
        <StatusButton project={project} status={status} />
      </div>
      <div className="mt-4">
        <SegmentedControl label="Section" value={tab} onChange={(v) => setTab(v === 'overview' ? null : v)} options={TABS} lane={2} />
      </div>
      {tab === 'overview' && <Overview portfolio={portfolio} project={project} state={state} atlas={atlas} today={today} onOpen={onOpen} />}
      {tab === 'doc' && (
        <div className="mt-4">
          <h2 className="sr-only">Tech doc</h2>
          {doc ? (
            <TechDoc
              atlas={atlas}
              model={portfolioDocModel(project, doc, atlas, onOpen)}
              design={design}
              done={done}
              onToggle={(unitId) => void setTick(project.id, milestoneIds.has(unitId) ? 'milestones' : 'doneWhen', unitId)}
              onOpen={({ kind, id }) => onOpen(kind, id)}
            />
          ) : (
            <EmptyState>This project has no tech doc.</EmptyState>
          )}
          <RowList flat className="mt-4">
            <Row title="Full tech doc in Claude" meta={project.tech_doc.tab} href={project.tech_doc.url} icon={<IconTile icon="doc" tone="neutral" />} />
          </RowList>
        </div>
      )}
      {tab === 'ship' && <Ship portfolio={portfolio} project={project} state={state} />}
      <LogTimeSheet open={logging} onClose={() => setLogging(false)} date={today} block={block} portfolio={{ id: project.id, code: project.code, track }} />
      <ItemSheet atlas={atlas} id={itemParam} onClose={() => setItem(null)} />
      <PaperSheet paper={paperParam ? (atlas.seed.papers.find((p) => p.id === paperParam) ?? null) : null} state={paperParam ? paperStates?.get(paperParam) : undefined} onClose={() => setPaper(null)} />
    </>
  );
}

/* ------------------------------------------------------------------ the screen */

export function Portfolio({ id }: { id?: string }) {
  const atlas = useAtlas();
  // Read first rows name resources of the Library's long tail: ask for it at once.
  useLibrary(true);
  const portfolio = usePortfolio();
  const states = usePortfolioStates();
  const today = todayDate();
  const project = id && portfolio ? portfolio.projects.find((p) => p.id === id) : undefined;

  if (!atlas || portfolio === undefined || !states) {
    return (
      <Screen title="Portfolio">
        <Header title="Portfolio" backTo="/plan" backLabel="Back to Plan" />
        <p className="pt-6 text-meta text-ink2" role="status">
          Loading…
        </p>
      </Screen>
    );
  }
  if (!portfolio) {
    return (
      <Screen title="Portfolio">
        <Header title="Portfolio" backTo="/plan" backLabel="Back to Plan" sub="No portfolio yet" />
        <EmptyState>No portfolio yet. Add data/portfolio/projects.json and rebuild.</EmptyState>
      </Screen>
    );
  }
  if (id) {
    return (
      <Screen title={project ? project.code + ' · Portfolio' : 'Portfolio'}>
        {project ? (
          <ProjectPage key={project.id} portfolio={portfolio} project={project} states={states} atlas={atlas} today={today} />
        ) : (
          <>
            <Header title="Portfolio" backTo="/portfolio" backLabel="Back to Portfolio" />
            <EmptyState>No portfolio project has that id.</EmptyState>
          </>
        )}
      </Screen>
    );
  }
  const intro = portfolio.intro.split(':')[0]!.replace(/\.$/, '') + '.';
  return (
    <Screen title="Portfolio">
      <Header title="Portfolio" backTo="/plan" backLabel="Back to Plan" sub={progressLine(portfolio.projects, states, today)} />
      <p className="mt-2 text-meta text-ink2">{intro}</p>
      <PortfolioList portfolio={portfolio} states={states} today={today} />
      <p className="sr-only">{plural(portfolio.projects.length, 'portfolio project')}</p>
    </Screen>
  );
}
