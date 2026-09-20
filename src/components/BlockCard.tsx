import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.tsx';
import { TrackDot } from './TrackDot.tsx';
import { Link } from '../router/router.tsx';
import { clearTimer, setItemStatus, startTimer, toggleUnit } from '../db/state.ts';
import { formatMinutes, formatStopwatch, parseDuration } from '../lib/dates.ts';
import type { ScheduledItem, TodayBlock } from '../lib/schedule.ts';
import type { RunningTimer } from '../db/types.ts';
import type { Track } from '../seed/schema.ts';

interface BlockCardProps {
  block: TodayBlock;
  loggedMinutes: number;
  /** Minutes logged against the block's own item, so the timer knows what to add to. */
  itemMinutes: number;
  weeklyMinutes: number;
  done: boolean;
  timer: RunningTimer | null;
  tracks: Track[];
  onAddMinutes: (item: ScheduledItem, minutes: number) => void;
  onSetMinutes: (item: ScheduledItem, minutes: number) => void;
  onToggleDone: () => void;
  onPickAnother: () => void;
}

const BLOCK_LABEL: Record<string, string> = { A: 'Block A', B: 'Block B', C: 'Block C', D: 'Block D', E: 'Block E' };

function ProgressBar({ done, total }: { done: number; total: number }) {
  if (total <= 0) return null;
  const percent = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised" role="presentation">
        <div className="h-full rounded-full bg-accent-fill" style={{ width: percent + '%' }} />
      </div>
      <span className="num shrink-0 text-xs text-ink-3">
        {done}/{total}
      </span>
    </div>
  );
}

/** A running stopwatch. Re-renders once a second, and only while it is running. */
function Stopwatch({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="num tabular-nums" aria-live="off">
      {formatStopwatch(now - startedAt)}
    </span>
  );
}

function MinutesEntry({ value, onCommit }: { value: number; onCommit: (minutes: number) => void }) {
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = (): void => {
    const minutes = parseDuration(text);
    if (minutes !== null) onCommit(minutes);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm num"
        onClick={() => {
          setText(String(value));
          setEditing(true);
        }}
        title="Set the minutes for this block by hand"
      >
        <Icon name="clock" size={14} />
        {formatMinutes(value)}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <input
        ref={inputRef}
        className="input num h-7 w-20 px-2 text-xs"
        style={{ minHeight: '1.75rem' }}
        value={text}
        aria-label="Minutes for this block"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    </span>
  );
}

function ItemBody({ item, tracks }: { item: ScheduledItem; tracks: Track[] }) {
  const track = tracks.find((t) => t.id === item.track);
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <TrackDot track={track} />
        <Link to={'/library/' + item.refId} className="text-[0.9375rem] font-semibold leading-snug hover:text-accent-text">
          {item.title}
        </Link>
        {item.provider && <span className="text-xs text-ink-3">{item.provider}</span>}
      </div>

      {item.nextUnit && (
        <p className="mt-1.5 text-sm text-ink-2">
          <span className="text-ink-3">Next:</span>{' '}
          {item.nextUnit.url ? (
            <a href={item.nextUnit.url} target="_blank" rel="noreferrer noopener" className="text-accent-text hover:underline">
              {item.nextUnit.title}
            </a>
          ) : (
            item.nextUnit.title
          )}{' '}
          <span className="num text-ink-3">
            ({item.nextUnit.position} of {item.nextUnit.total})
          </span>
        </p>
      )}

      {item.kind === 'project' && item.brief && <p className="mt-1.5 line-clamp-3 text-sm text-ink-2">{item.brief}</p>}

      {item.note && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-3">
          <Icon name="info" size={13} className="mt-px" />
          {item.note}
        </p>
      )}

      {item.unitCount > 0 && (
        <div className="mt-2.5">
          <ProgressBar done={item.unitsDone} total={item.unitCount} />
        </div>
      )}
    </>
  );
}

function ItemActions({
  item,
  timer,
  onStart,
  onStop,
  onNextUnitDone,
}: {
  item: ScheduledItem;
  timer: RunningTimer | null;
  onStart: () => void;
  onStop: () => void;
  onNextUnitDone: () => void;
}) {
  const running = timer?.refId === item.refId;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {running ? (
        <button type="button" className="btn btn-sm btn-primary" onClick={onStop}>
          <Icon name="stop" size={13} />
          Stop <Stopwatch startedAt={timer.startedAt} />
        </button>
      ) : (
        <button type="button" className="btn btn-sm" onClick={onStart} disabled={Boolean(timer)} title={timer ? 'Another timer is running' : 'Start a timer for this item'}>
          <Icon name="play" size={13} />
          Start
        </button>
      )}

      {item.nextUnit && (
        <button type="button" className="btn btn-sm" onClick={onNextUnitDone}>
          <Icon name="check" size={13} />
          {item.kind === 'project' ? 'Tick criterion' : 'Unit done'}
        </button>
      )}

      {item.url ? (
        <a href={item.url} target="_blank" rel="noreferrer noopener" className="btn btn-sm btn-ghost">
          <Icon name="external" size={13} />
          Open
        </a>
      ) : (
        item.searchHint && (
          <a
            href={'https://duckduckgo.com/?q=' + encodeURIComponent(item.searchHint)}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-sm btn-ghost text-warning-text"
            title={'No verified link yet. Search: ' + item.searchHint}
          >
            <Icon name="search" size={13} />
            Find link
          </a>
        )
      )}
    </div>
  );
}

export function BlockCard(props: BlockCardProps) {
  const { block, loggedMinutes, itemMinutes, weeklyMinutes, done, timer, tracks } = props;
  const rest = block.kind === 'rest';
  const percent = block.targetMinutes > 0 ? Math.min(100, Math.round((loggedMinutes / block.targetMinutes) * 100)) : 0;

  const start = (item: ScheduledItem): void => {
    void startTimer({ block: block.id, track: item.track, refId: item.refId });
  };
  const stop = (item: ScheduledItem): void => {
    if (!timer) return;
    const minutes = Math.round((Date.now() - timer.startedAt) / 60_000);
    void clearTimer();
    if (minutes > 0) props.onAddMinutes(item, minutes);
    if (item.status === 'todo') void setItemStatus(item.refId, 'active');
  };

  return (
    <section
      className={'card p-4 transition-opacity' + (rest ? ' opacity-60' : '')}
      aria-labelledby={'block-' + block.id}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="eyebrow">{BLOCK_LABEL[block.id]}</span>
            {done && (
              <span className="chip border-good/40 px-1.5 text-good-text">
                <Icon name="check" size={11} />
                Done
              </span>
            )}
          </div>
          <h2 id={'block-' + block.id} className="text-sm font-semibold text-ink-2">
            {block.def.name}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <span className="num text-xs text-ink-3">
            {formatMinutes(loggedMinutes)} / {formatMinutes(block.targetMinutes)}
          </span>
          {!rest && (
            <button
              type="button"
              className={'btn btn-icon btn-sm' + (done ? ' text-good-text' : ' btn-ghost')}
              onClick={props.onToggleDone}
              aria-pressed={done}
              aria-label={done ? 'Mark block ' + block.id + ' as not done' : 'Mark block ' + block.id + ' as done'}
              title={done ? 'Not done after all' : 'Mark this block done'}
            >
              <Icon name="check" size={16} />
            </button>
          )}
        </div>
      </header>

      {!rest && block.targetMinutes > 0 && (
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-raised" role="presentation">
          <div className="h-full rounded-full bg-accent-fill transition-[width] duration-300" style={{ width: percent + '%' }} />
        </div>
      )}

      {block.kind === 'review' && (
        <div className="rounded-lg border border-line bg-raised/50 p-3">
          <p className="text-sm font-medium">Weekly review and paper reading</p>
          <p className="mt-1 text-sm text-ink-2">
            Close the week: fill in the review, then read this week&apos;s paper.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Link to="/reviews" className="btn btn-sm btn-primary">
              Open the review
            </Link>
            <Link to="/papers" className="btn btn-sm">
              Reading queue
            </Link>
          </div>
        </div>
      )}

      {block.kind === 'empty' && <p className="text-sm text-ink-3">{block.emptyReason}</p>}
      {rest && <p className="text-sm text-ink-3">{block.emptyReason}</p>}

      {block.item && (
        <div>
          <ItemBody item={block.item} tracks={tracks} />
          <ItemActions
            item={block.item}
            timer={timer}
            onStart={() => start(block.item!)}
            onStop={() => stop(block.item!)}
            onNextUnitDone={() => {
              const unit = block.item!.nextUnit;
              if (unit) void toggleUnit(block.item!.refId, unit.id);
            }}
          />
          <div className="mt-2 flex items-center gap-1 text-xs text-ink-3">
            <MinutesEntry value={itemMinutes} onCommit={(m) => props.onSetMinutes(block.item!, m)} />
            <span>on this item today</span>
          </div>
        </div>
      )}

      {block.weeklyBuild && (
        <div className={block.item ? 'mt-4 border-t border-line pt-3' : ''}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="eyebrow">This week&apos;s mini-build</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={props.onPickAnother} title="Suggest a different mini-build">
              <Icon name="shuffle" size={13} />
              Another
            </button>
          </div>
          <ItemBody item={block.weeklyBuild} tracks={tracks} />
          <ItemActions
            item={block.weeklyBuild}
            timer={timer}
            onStart={() => start(block.weeklyBuild!)}
            onStop={() => stop(block.weeklyBuild!)}
            onNextUnitDone={() => {
              const unit = block.weeklyBuild!.nextUnit;
              if (unit) void toggleUnit(block.weeklyBuild!.refId, unit.id);
            }}
          />
          <div className="mt-2 flex items-center gap-1 text-xs text-ink-3">
            <MinutesEntry value={weeklyMinutes} onCommit={(m) => props.onSetMinutes(block.weeklyBuild!, m)} />
            <span>on the mini-build today</span>
          </div>
        </div>
      )}
    </section>
  );
}
