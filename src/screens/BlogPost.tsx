import { useEffect, useMemo, useState } from 'react';
import { checkBlogPost, setBlogPosted, useBlogPosts, useBlogSettings } from '../db/blog.ts';
import { useDayTicks } from '../db/ticks.ts';
import type { TickNote } from '../db/ticks.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import type { Atlas } from '../hooks/useAtlas.ts';
import { useUnits } from '../hooks/useUnits.ts';
import { blogDayNumber, blogFacts, blogOutline, writingStreak } from '../lib/blog.ts';
import type { DayTick } from '../lib/blog.ts';
import { dayLayout } from '../lib/calendar.ts';
import { dayName, monthName, today as todayDate } from '../lib/dates.ts';
import { announceEdit } from '../lib/edit-events.ts';
import { planForDay } from '../lib/schedule.ts';
import { useQueryParam } from '../router/router.tsx';
import type { Unit } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { Header } from '../ui/Header.tsx';
import { BlockTile } from '../ui/glyphs.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { nameOf, span } from './parts/text.ts';
import { lessonLabel } from './parts/LessonChecklist.tsx';

/** "Sun 18 Oct": the header's and the outline's date. */
function shortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number) as [number, number, number];
  return dayName(date, true) + ' ' + d + ' ' + monthName(m - 1, true);
}

/** Whether "Open my blog" was used on a date, in this tab: it goes with the day's mark as `editorLinkUsed`. */
const OPENED_KEY = (date: string): string => 'atlas-blog-opened-' + date;
function wasOpened(date: string): boolean {
  try {
    return sessionStorage.getItem(OPENED_KEY(date)) === '1';
  } catch {
    return false;
  }
}

/**
 * The day's ticks, worded for the outline: a unit by its title, a milestone or a unit with no known title by its item
 * ("One finished small game · 2 ticked"), an item finished by its name. Each goes with the block that plans its item
 * that day, when one does.
 */
function dayTicks(atlas: Atlas, date: string, notes: readonly TickNote[], units: Record<string, Unit[]> | undefined): DayTick[] {
  const plan = planForDay({ date, settings: atlas.settings, ctx: { seed: atlas.seed, states: atlas.states } });
  const blockOf = (refId: string): string | undefined => plan.blocks.find((b) => b.item?.refId === refId || b.weeklyBuild?.refId === refId)?.id ?? atlas.seed.plan.find((i) => (i.resourceId ?? i.projectId) === refId)?.block;
  const titleOf = (refId: string): string => {
    const item = atlas.seed.resources.find((r) => r.id === refId) ?? atlas.seed.projects.find((p) => p.id === refId);
    return item ? nameOf(item) : refId;
  };
  const out: DayTick[] = [];
  const untitled = new Map<string, number>();
  for (const note of notes) {
    if (!note.unit) continue;
    const unit = units?.[note.refId]?.find((u) => u.id === note.unit);
    // A lesson checklist's unit by its number too ("1.7 Introduction to NumPy").
    if (unit) out.push({ refId: note.refId, label: unit.kind ? lessonLabel(unit) : unit.title, block: blockOf(note.refId) });
    else untitled.set(note.refId, (untitled.get(note.refId) ?? 0) + 1);
  }
  for (const [refId, n] of untitled) out.push({ refId, label: titleOf(refId) + ' · ' + n + ' ticked', block: blockOf(refId) });
  const finished = new Set([...notes.filter((n) => !n.unit).map((n) => n.refId), ...[...atlas.states.values()].filter((s) => s.status === 'done' && s.doneAt === date).map((s) => s.refId)]);
  for (const refId of finished) out.push({ refId, label: titleOf(refId) + ' finished', block: blockOf(refId) });
  return out;
}

/**
 * "Today's blog post" (DAILY-BLOG): the day's facts and an outline built from them to start the post from, the writing
 * streak, Open my blog (the screen's one filled button: Pages CMS, or the link set in Settings › Blog) and I posted
 * it. The post is written in the user's own blog; Atlas keeps only whether it was.
 */
export function BlogPost() {
  const atlas = useAtlas();
  const posts = useBlogPosts();
  const blog = useBlogSettings();
  const units = useUnits();
  const today = todayDate();
  const [dateParam] = useQueryParam('date');
  // "Write log entry" on a resource's sheet (ATLAS-LIBRARY): the outline starts with that resource.
  const [refParam] = useQueryParam('ref');
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam <= today ? dateParam : today;
  const notes = useDayTicks(date);
  const [copied, setCopied] = useState<string | null>(null);

  // Detection, when it is on: look now, for today, in case the post went up since the evening's check.
  useEffect(() => {
    if (date === today) void checkBlogPost(date, { force: true }).catch(() => undefined);
  }, [date, today]);
  useEffect(() => {
    if (!copied) return undefined;
    const id = window.setTimeout(() => setCopied(null), 3_000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const view = useMemo(() => {
    if (!atlas || !notes) return null;
    const names = new Map(atlas.settings.core.blocks.map((b) => [b.id, b.name]));
    const order = dayLayout(date, atlas.settings).map((p) => ({ id: p.id, name: names.get(p.id) ?? p.id }));
    const blocks = [...order, ...atlas.settings.core.blocks.filter((b) => !order.some((o) => o.id === b.id)).map((b) => ({ id: b.id, name: b.name }))];
    const facts = blogFacts(atlas.logs.find((l) => l.date === date), blocks, dayTicks(atlas, date, notes, units));
    const heading = shortDate(date) + ' · day ' + blogDayNumber(date);
    const resource = refParam ? atlas.seed.resources.find((r) => r.id === refParam) : undefined;
    const topic = resource ? { title: resource.title, url: resource.url, track: atlas.seed.tracks.find((t) => t.id === resource.tracks[0])?.name ?? resource.tracks[0]! } : undefined;
    return { facts, heading, topic, outline: blogOutline(facts, heading, span, topic) };
  }, [atlas, notes, units, date, refParam]);

  const isToday = date === today;
  const title = isToday ? 'Today’s blog post' : 'Blog post';
  const back = <Button variant="icon" icon="chevronLeft" label={isToday ? 'Back to Today' : 'Back to the day in Calendar'} to={isToday ? '/' : '/calendar?view=day&date=' + date} />;
  if (!atlas || !posts || !blog || !view) {
    return (
      <Screen title={title}>
        <Header title={title} back={back} />
        <p className="pt-6 text-meta text-ink2" role="status">
          Loading the day…
        </p>
      </Screen>
    );
  }

  const record = posts.find((p) => p.date === date);
  const posted = Boolean(record?.posted);
  const studied = (d: string): boolean => (atlas.logs.find((l) => l.date === d)?.entries ?? []).some((e) => e.minutes > 0);
  const streak = writingStreak(posts, studied, today);

  const markPosted = async (): Promise<void> => {
    if (posted) {
      await setBlogPosted(date, false);
      return;
    }
    await setBlogPosted(date, true, { editorLinkUsed: wasOpened(date) });
    announceEdit({ group: 'blog:' + date, label: 'Marked the blog post as posted', undo: async () => (await setBlogPosted(date, false), true) });
  };
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(view.outline);
      setCopied('Copied');
    } catch {
      setCopied('Could not reach the clipboard. Allow it for this site and try again.');
    }
  };

  return (
    <Screen title={title}>
      <Header title={title} back={back} sub={shortDate(date) + ' · day ' + blogDayNumber(date) + ' · written in your blog'} />

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="tile flex flex-col items-center gap-2 p-3.5">
          <span className="section-label mb-0">Writing streak</span>
          <span className="well well-blue rounded-[14px] px-3.5 py-1 text-card font-semibold leading-tight text-blue-deep">{streak}</span>
          <span className="text-meta text-ink2">{streak === 1 ? 'day' : 'days'} in a row</span>
        </div>
        <div className="tile flex flex-col items-center gap-2 p-3.5">
          <span className="section-label mb-0">This post</span>
          <span className="text-card font-semibold leading-tight">{posted ? 'Posted ✓' : 'Not yet'}</span>
          <span className="text-meta text-ink2">{posted && record?.auto ? 'found in your blog' : posted ? 'marked by you' : 'write it in your blog'}</span>
        </div>
      </div>

      <RowList className="mt-6" label={isToday ? 'What you did today' : 'What you did that day'} aside={span(view.facts.totalMinutes)}>
        {view.facts.blocks.length === 0 ? (
          <Row title="Nothing logged" meta="Time on the timer shows here, block by block" />
        ) : (
          view.facts.blocks.map((b) => (
            <Row
              key={b.id}
              icon={<BlockTile block={b.id} />}
              title={b.name}
              meta={b.ticked.length > 0 ? b.ticked.join(' · ') : 'Nothing ticked'}
              trailing={span(b.minutes)}
              truncate
            />
          ))
        )}
      </RowList>

      <section className="mt-6 flex flex-col gap-3" aria-labelledby="outline-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="outline-title" className="section-label mb-0">
            Outline to start from
          </h2>
          <Button size="sm" icon="copy" onClick={() => void copy()}>
            Copy outline
          </Button>
        </div>
        <pre className="doc-block whitespace-pre-wrap" aria-label="The outline, in Markdown">
          {view.outline}
        </pre>
      </section>

      <div className="mt-6 flex gap-3 [&>*]:min-w-0 [&>*]:flex-1">
        <Button icon={posted ? 'check' : undefined} aria-pressed={posted} name={posted ? 'Posted, tap to undo' : 'I posted it'} onClick={() => void markPosted()}>
          {posted ? 'Posted ✓' : 'I posted it'}
        </Button>
        <Button
          variant="filled"
          icon="external"
          href={blog.editorLink}
          onClick={() => {
            try {
              sessionStorage.setItem(OPENED_KEY(date), '1');
            } catch {
              // Storage blocked: the mark simply goes without editorLinkUsed.
            }
          }}
        >
          Open my blog
        </Button>
      </div>
      <p className="mt-3 text-meta text-ink2">Opens {blog.editorLink.replace(/^https:\/\//, '')} in a new tab. Change the link in Settings › Blog.</p>

      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-[640px] px-5">
        {copied && <p className="pointer-events-auto flex min-h-11 items-center knob rounded-pill px-5 text-meta text-ink">{copied}</p>}
      </div>
    </Screen>
  );
}
