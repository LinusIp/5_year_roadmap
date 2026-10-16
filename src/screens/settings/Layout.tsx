import type { Layout as LayoutSettings, StoredSettings, TabId, Theme } from '../../db/types.ts';
import { PLAN_SEGMENTS, TAB_IDS } from '../../db/types.ts';
import { defaultLayout } from '../../db/settings.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { formatClock, today } from '../../lib/dates.ts';
import { planForDay } from '../../lib/schedule.ts';
import type { TodayBlock } from '../../lib/schedule.ts';
import { seed } from '../../seed/index.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { TAB_DEFS } from '../../ui/Screen.tsx';
import { SegmentedControl } from '../../ui/SegmentedControl.tsx';
import { blockShort, dateTitle, nameOf, span } from '../parts/text.ts';
import { Section, saveCore, saveSettings } from './shared.tsx';

function saveLayout(change: (layout: LayoutSettings) => LayoutSettings): void {
  void saveSettings((s) => ({ ...s, layout: change(structuredClone(s.layout)) }));
}

/** What Today shows with these settings, drawn small: the same choices, the real day. */
function TodayPreview({ atlas }: { atlas: Atlas }) {
  const { settings } = atlas;
  const layout = settings.layout.today;
  const date = today();
  const plan = planForDay({ date, settings, ctx: { seed: atlas.seed, states: atlas.states } });
  const blocks = layout.now === 'order' ? [...plan.blocks].sort((a, b) => layout.order.indexOf(a.id) - layout.order.indexOf(b.id)) : plan.blocks;
  const title = (b: TodayBlock): string => (b.kind === 'review' ? 'Weekly review and paper' : b.weeklyBuild && b.id === 'D' ? nameOf(b.weeklyBuild) : b.item ? nameOf(b.item) : (b.emptyReason ?? 'Nothing planned'));
  const [now, ...later] = blocks;
  return (
    <figure aria-label="Preview of Today" className="rounded-card border border-line bg-canvas p-3">
      <div className="space-y-1 text-meta">
        <p className="font-medium text-ink">{dateTitle(date)}</p>
        {layout.stats && <p className="text-ink2">{'0 h of ' + span(plan.targetMinutes) + ' today · ' + formatClock(new Date(), settings.layout.general.clock)}</p>}
        {now ? (
          <div className="rounded-button bg-surface p-2">
            <p className="text-ink2">Now</p>
            <p className="font-medium text-ink">{title(now)}</p>
            <p className="text-ink2">{blockShort(now.def.name) + ' · 0 h of ' + span(now.targetMinutes)}</p>
          </div>
        ) : (
          <p className="text-ink2">A rest day.</p>
        )}
        {layout.later && later.length > 0 && (
          <ul className="divide-y divide-line border-y border-line">
            {later.map((b) => (
              <li key={b.id} className="py-1">
                <span className="text-ink">{title(b)}</span>
                {layout.view === 'detailed' && <span className="block text-ink2">{blockShort(b.def.name)}</span>}
              </li>
            ))}
          </ul>
        )}
        {layout.review && <p className="text-ink2">Weekly review on Sunday</p>}
        {layout.footer && <p className="text-ink2">Done today, and sync notices</p>}
      </div>
    </figure>
  );
}

function OrderList<T extends string>({ items, label, name, onChange }: { items: T[]; label: (id: T) => string; name: string; onChange: (next: T[]) => void }) {
  const move = (from: number, to: number): void => {
    const next = [...items];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    onChange(next);
  };
  return (
    <RowList label={name}>
      {items.map((id, i) => (
        <Row
          key={id}
          title={label(id)}
          action={
            <span className="flex shrink-0">
              <Button variant="icon" icon="arrowUp" label={'Move ' + label(id) + ' up'} aria-disabled={i === 0 || undefined} onClick={() => i > 0 && move(i, i - 1)} />
              <Button variant="icon" icon="arrowDown" label={'Move ' + label(id) + ' down'} aria-disabled={i === items.length - 1 || undefined} onClick={() => i < items.length - 1 && move(i, i + 1)} />
            </span>
          }
        />
      ))}
    </RowList>
  );
}

const SEGMENT_LABEL: Record<(typeof PLAN_SEGMENTS)[number], string> = { timeline: 'Timeline', projects: 'Projects', papers: 'Papers', credentials: 'Credentials', roadmaps: 'Roadmaps' };

/**
 * Settings > Layout: what Today shows (with a live preview), the tabs and their order, Plan's first view, and the
 * general look. Each part resets to the default on its own.
 */
export function Layout({ atlas }: { atlas: Atlas }) {
  const settings: StoredSettings = atlas.settings;
  const layout = settings.layout;
  const fresh = defaultLayout(settings.core);
  const blockName = (id: string): string => 'Block ' + id + ' · ' + blockShort(settings.core.blocks.find((b) => b.id === id)?.name ?? id);
  const order = [...layout.today.order.filter((id) => settings.core.blocks.some((b) => b.id === id)), ...settings.core.blocks.map((b) => b.id).filter((id) => !layout.today.order.includes(id))];
  const toggleTab = (id: TabId, on: boolean): void =>
    saveLayout((l) => {
      const tabs = on ? [...l.tabs, id] : l.tabs.filter((t) => t !== id);
      if (tabs.length < 3 || tabs.length > 5) return l;
      return { ...l, tabs };
    });

  return (
    <>
      <Section id="layout" title="Layout · Today" onReset={() => saveLayout((l) => ({ ...l, today: fresh.today }))}>
        <TodayPreview atlas={atlas} />
        <RowList className="mt-3">
          <Row title="The day's numbers" meta="Hours against the plan, and the streak" toggle={{ on: layout.today.stats, onChange: (on) => saveLayout((l) => ((l.today.stats = on), l)) }} />
          <Row title="Later today" toggle={{ on: layout.today.later, onChange: (on) => saveLayout((l) => ((l.today.later = on), l)) }} />
          <Row title="The weekly-review line" toggle={{ on: layout.today.review, onChange: (on) => saveLayout((l) => ((l.today.review = on), l)) }} />
          <Row title="The footer" meta="What is done today, and sync notices" toggle={{ on: layout.today.footer, onChange: (on) => saveLayout((l) => ((l.today.footer = on), l)) }} />
        </RowList>
        <div className="mt-3 space-y-3">
          <SegmentedControl
            label="Later today shows"
            value={layout.today.view}
            onChange={(view: 'detailed' | 'compact') => saveLayout((l) => ((l.today.view = view), l))}
            options={[
              { value: 'detailed', label: 'Detailed' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
          <SegmentedControl
            label="Now is"
            value={layout.today.now}
            onChange={(now: 'first' | 'order') => saveLayout((l) => ((l.today.now = now), (l.today.order = order), l))}
            options={[
              { value: 'first', label: 'The first unfinished block' },
              { value: 'order', label: 'In my order' },
            ]}
          />
          {layout.today.now === 'order' && <OrderList items={order} label={blockName} name="Order of Now" onChange={(next) => saveLayout((l) => ((l.today.order = next), l))} />}
        </div>
      </Section>

      <Section title="Layout · Tabs" onReset={() => saveLayout((l) => ({ ...l, tabs: fresh.tabs }))}>
        <RowList>
          {TAB_IDS.map((id) => {
            const on = layout.tabs.includes(id);
            const locked = id === 'today' || (on && layout.tabs.length <= 3) || (!on && layout.tabs.length >= 5);
            return (
              <Row
                key={id}
                title={TAB_DEFS[id].label}
                meta={id === 'today' ? 'Always first' : locked ? (on ? 'At least three tabs' : 'At most five tabs') : undefined}
                toggle={{ on, disabled: locked, onChange: (next) => toggleTab(id, next) }}
              />
            );
          })}
        </RowList>
        <div className="mt-3">
          <OrderList items={layout.tabs.filter((t) => t !== 'today')} label={(id) => TAB_DEFS[id].label} name="Order after Today" onChange={(next) => saveLayout((l) => ((l.tabs = ['today', ...next]), l))} />
        </div>
      </Section>

      <Section title="Layout · Plan" onReset={() => saveLayout((l) => ({ ...l, plan: fresh.plan }))}>
        <RowList>
          {PLAN_SEGMENTS.map((segment) => (
            <Row key={segment} title={SEGMENT_LABEL[segment]} meta={segment === 'roadmaps' ? 'Credentials, with the roadmaps at the top' : undefined} selected={layout.plan.segment === segment} onClick={() => saveLayout((l) => ((l.plan.segment = segment), l))} />
          ))}
          <Row title="Show dropped items" meta="A collapsed group in each lane, with Restore" toggle={{ on: layout.plan.showDropped, onChange: (on) => saveLayout((l) => ((l.plan.showDropped = on), l)) }} />
        </RowList>
      </Section>

      <Section
        title="Layout · General"
        onReset={() => {
          saveLayout((l) => ({ ...l, general: fresh.general }));
          void saveSettings((s) => ({ ...s, theme: 'light' }));
          void saveCore((core) => ((core.weekStartsOn = seed.settings.weekStartsOn), core));
        }}
      >
        <div className="space-y-3">
          <SegmentedControl
            label="Theme"
            value={settings.theme}
            onChange={(theme: Theme) => void saveSettings((s) => ({ ...s, theme }))}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'Follow the system' },
            ]}
          />
          <SegmentedControl
            label="Week starts on"
            value={String(settings.core.weekStartsOn)}
            onChange={(v) => void saveCore((core) => ((core.weekStartsOn = Number(v) as 0 | 1), core))}
            options={[
              { value: '1', label: 'Week starts Monday' },
              { value: '0', label: 'Week starts Sunday' },
            ]}
          />
          <SegmentedControl
            label="Clock"
            value={layout.general.clock}
            onChange={(clock: '24' | '12') => saveLayout((l) => ((l.general.clock = clock), l))}
            options={[
              { value: '24', label: '24-hour' },
              { value: '12', label: '12-hour' },
            ]}
          />
          <SegmentedControl
            label="Density"
            value={layout.general.density}
            onChange={(density: 'comfortable' | 'compact') => saveLayout((l) => ((l.general.density = density), l))}
            options={[
              { value: 'comfortable', label: 'Comfortable' },
              { value: 'compact', label: 'Compact' },
            ]}
          />
          <p className="text-meta text-ink2">Compact only tightens the rows; every button stays at least 44 px tall.</p>
        </div>
      </Section>
    </>
  );
}
