import { useEffect, useMemo, useRef, useState } from 'react';
import { checkBlogPost, saveBlogDraft, setBlogPosted, useBlogPosts, useBlogSettings } from '../db/blog.ts';
import type { BlogDraft } from '../db/blog.ts';
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
import { laneSlot } from '../lib/scenes.ts';
import { planForDay } from '../lib/schedule.ts';
import { useQueryParam } from '../router/router.tsx';
import type { Unit } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { Header } from '../ui/Header.tsx';
import { Switch } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { nameOf, span } from './parts/text.ts';
import { lessonLabel } from './parts/LessonChecklist.tsx';

/** "Sun 18 Oct": the header's and the outline's date. */
function shortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number) as [number, number, number];
  return dayName(date, true) + ' ' + d + ' ' + monthName(m - 1, true);
}

/** Whether "Publish" opened the blog on a date, in this tab: it goes with the day's mark as `editorLinkUsed`. */
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

/** The post as Markdown: the draft's fields under their headings, then the day's facts (the outline of DAILY-BLOG). */
function composePost(draft: BlogDraft, heading: string, outline: string): string {
  const lines = ['# ' + (draft.title?.trim() || heading), ''];
  const section = (title: string, text: string | undefined): void => {
    if (!text?.trim()) return;
    lines.push('## ' + title, '', text.trim(), '');
  };
  section('What I learned', draft.learned);
  section('Where I got stuck', draft.stuck);
  section('Tomorrow', draft.next);
  // The facts' outline minus its own heading line.
  lines.push(...outline.split('\n').slice(2));
  return lines.join('\n').trimEnd() + '\n';
}

/** A sunken text field of the log (the mockup's .well): the title in 17/800, the answers in 15/600. */
function Field({ label, value, placeholder, onChange, onBlur, title = false, rows = 3 }: { label: string; value: string; placeholder: string; onChange: (v: string) => void; onBlur: () => void; title?: boolean; rows?: number }) {
  const id = 'log-' + label.toLowerCase().replace(/[^a-z]+/g, '-');
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      {title ? <span className="section-label mb-0 uppercase">{label}</span> : <span className="text-chip font-medium">{label}</span>}
      {title ? (
        <input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className="well min-h-12 w-full rounded-knob px-3.5 text-[17px] font-semibold text-ink outline-none placeholder:text-ink2 focus-visible:outline-2 focus-visible:outline-[var(--x2)]" />
      ) : (
        <textarea id={id} value={value} placeholder={placeholder} rows={rows} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className="well w-full resize-none rounded-knob px-3.5 py-3 text-chip leading-[1.45] text-ink outline-none placeholder:text-ink2 focus-visible:outline-2 focus-visible:outline-[var(--x2)]" />
      )}
    </label>
  );
}

/**
 * The daily log (DAILY-BLOG, redrawn to the redesign mockup): what the day's logs say, the post's title and three
 * answers written here and kept as the day's draft, the photo's name for the gallery, and Publish: the post goes to
 * the clipboard, the blog's editor opens (Pages CMS, or the link set in Settings › Blog) and the day is marked posted.
 * Atlas never writes to the blog itself.
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
  const [draft, setDraft] = useState<BlogDraft | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  // Detection, when it is on: look now, for today, in case the post went up since the evening's check.
  useEffect(() => {
    if (date === today) void checkBlogPost(date, { force: true }).catch(() => undefined);
  }, [date, today]);
  useEffect(() => {
    if (!copied && !saved) return undefined;
    const id = window.setTimeout(() => {
      setCopied(null);
      setSaved(null);
    }, 3_000);
    return () => window.clearTimeout(id);
  }, [copied, saved]);

  const record = posts?.find((p) => p.date === date);
  // The fields start from the stored draft, once; typing keeps them here until a blur or Save draft stores them.
  useEffect(() => {
    if (posts === undefined) return;
    setDraft((d) => d ?? { title: record?.title ?? '', learned: record?.learned ?? '', stuck: record?.stuck ?? '', next: record?.next ?? '', photo: record?.photo, publish: record?.publish ?? true });
    // The stored record only seeds the fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts === undefined, date]);

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
  const title = isToday ? 'Today’s log' : 'The day’s log';
  const backTo = isToday ? '/' : '/calendar?view=day&date=' + date;
  const backLabel = isToday ? 'Back to Today' : 'Back to the day in Calendar';
  if (!atlas || !posts || !blog || !view || !draft) {
    return (
      <Screen title={title}>
        <Header title={title} backTo={backTo} backLabel={backLabel} />
        <p className="pt-6 text-meta text-ink2" role="status">
          Loading the day…
        </p>
      </Screen>
    );
  }

  const posted = Boolean(record?.posted);
  const studied = (d: string): boolean => (atlas.logs.find((l) => l.date === d)?.entries ?? []).some((e) => e.minutes > 0);
  const streak = writingStreak(posts, studied, today);
  const post = composePost(draft, view.heading, view.outline);
  const publish = draft.publish ?? true;

  const store = (next: BlogDraft): void => void saveBlogDraft(date, () => next);
  const set = (key: keyof BlogDraft) => (value: string) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  const saveDraft = (): void => {
    store(draft);
    setSaved('Draft saved');
  };
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(post);
      setCopied('Copied');
    } catch {
      setCopied('Could not reach the clipboard. Allow it for this site and try again.');
    }
  };
  const publishPost = async (): Promise<void> => {
    store(draft);
    if (posted) {
      await setBlogPosted(date, false);
      return;
    }
    if (!publish) {
      setSaved('Saved');
      return;
    }
    await copy();
    try {
      sessionStorage.setItem(OPENED_KEY(date), '1');
    } catch {
      // Storage blocked: the mark simply goes without editorLinkUsed.
    }
    window.open(blog.editorLink, '_blank', 'noopener');
    await setBlogPosted(date, true, { editorLinkUsed: wasOpened(date) });
    announceEdit({ group: 'blog:' + date, label: 'Marked the blog post as posted', undo: async () => (await setBlogPosted(date, false), true) });
  };
  const blockNameOf = (id: string): string => atlas.settings.core.blocks.find((b) => b.id === id)?.name ?? id;

  return (
    <Screen title={title}>
      <Header
        title={title}
        backTo={backTo}
        backLabel={backLabel}
        sub={'Day ' + blogDayNumber(date) + ' · ' + shortDate(date) + (streak > 0 ? ' · ' + streak + (streak === 1 ? ' day' : ' days') + ' in a row' : '') + (posted && record?.auto ? ' · found in your blog' : '')}
        actions={<span className="pill-tint lane-2 rounded-pill px-2.5 py-1 text-small font-black">{posted ? 'Done' : 'Draft'}</span>}
      />

      {/* What the day's logs say (the mockup's pills): each block with time, its first tick and its minutes. */}
      <section className="tile mt-4 flex flex-col gap-2.5 px-[18px] py-3.5" aria-labelledby="studied-title">
        <h2 id="studied-title" className="section-label mb-0 uppercase">
          {(isToday ? 'What you studied today' : 'What you studied that day') + ' (from your logs)'}
        </h2>
        {view.facts.blocks.length === 0 ? (
          <p className="text-meta text-ink2">Nothing logged yet · time on the timer shows here, block by block</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {view.facts.blocks.map((b) => (
              <li key={b.id} className={'pill-tint lane-' + laneSlot(b.id) + ' inline-flex min-h-10 items-center rounded-pill px-3.5 text-label font-semibold'}>
                {blockNameOf(b.id) + (b.ticked[0] ? ' · ' + b.ticked[0] : '') + ' · ' + span(b.minutes)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="tile mt-4 flex flex-col gap-3 px-[18px] py-3.5" aria-label="The post">
        <Field label="Title" title value={draft.title ?? ''} placeholder={'Day ' + blogDayNumber(date) + ': what today was about'} onChange={set('title')} onBlur={() => store(draft)} />
        <Field label="What did I learn?" value={draft.learned ?? ''} placeholder="One idea per line" onChange={set('learned')} onBlur={() => store(draft)} rows={3} />
        <Field label="Where did I get stuck?" value={draft.stuck ?? ''} placeholder="Questions to come back to" onChange={set('stuck')} onBlur={() => store(draft)} rows={2} />
        <Field label="Tomorrow" value={draft.next ?? ''} placeholder="The first thing to do" onChange={set('next')} onBlur={() => store(draft)} rows={2} />
      </section>

      <section className="tile mt-4 px-[18px] py-1">
        <ul className="rows">
          <li className="flex min-h-[60px] items-center gap-3 py-1">
            <span className="flex min-w-0 flex-1 flex-col">
              <span id="publish-label" className="text-chip font-medium">
                Publish to my blog
              </span>
              <span className="truncate text-small text-ink2">{blog.repo.split('/')[1] ?? blog.repo} · GitHub Pages</span>
            </span>
            <Switch
              on={publish}
              labelledBy="publish-label"
              onChange={(on) => {
                const next = { ...draft, publish: on };
                setDraft(next);
                store(next);
              }}
            />
          </li>
          <li className="flex min-h-[60px] items-center gap-3 py-1">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-chip font-medium">Attach today&apos;s photo</span>
              <span className="truncate text-small text-ink2">{draft.photo ? draft.photo + ' · add it in your blog’s editor' : 'For the gallery on your site'}</span>
            </span>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Pick today's photo"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const next = { ...draft, photo: file.name };
                setDraft(next);
                store(next);
              }}
            />
            <Button variant="ice" lane={1} size="sm" className="!min-h-10" onClick={() => photoInput.current?.click()}>
              {draft.photo ? 'Change photo' : 'Add photo'}
            </Button>
          </li>
        </ul>
      </section>

      <div className="mt-4 flex gap-2.5">
        <Button className="flex-1" onClick={saveDraft}>
          Save draft
        </Button>
        <Button variant="filled" lane={2} className="flex-[1.4]" aria-pressed={posted} name={posted ? 'Published, tap to undo' : publish ? 'Publish: copy the post, open my blog and mark it posted' : 'Save the draft'} onClick={() => void publishPost()}>
          {posted ? 'Published ✓' : publish ? 'Publish' : 'Save'}
        </Button>
      </div>
      <p className="mt-3 text-small text-ink2">
        {publish ? 'Publish copies the post, opens ' + blog.editorLink.replace(/^https:\/\//, '') + ' in a new tab to paste it, and marks the day posted. Change the link in Settings › Blog.' : 'Only the draft is kept, on this device and in your sync.'}
      </p>

      <details className="mt-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-1 text-meta font-semibold text-ink2">
          The post as Markdown
          <Button size="sm" icon="copy" onClick={() => void copy()}>
            Copy outline
          </Button>
        </summary>
        <pre className="doc-block mt-2 whitespace-pre-wrap" aria-label="The post, in Markdown">
          {post}
        </pre>
      </details>

      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(7rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-[640px] px-5">
        {(copied ?? saved) && <p className="pointer-events-auto flex min-h-11 items-center knob rounded-pill px-5 text-meta text-ink">{copied ?? saved}</p>}
      </div>
    </Screen>
  );
}
