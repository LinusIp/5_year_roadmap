import type { Atlas } from '../../hooks/useAtlas.ts';
import { useCatalogueIndex, useChallengeEvents } from '../../hooks/useCatalogue.ts';
import { challengeStreak } from '../../lib/catalogue/daily.ts';
import { groupLabel, solvedSet, TIER_LABEL } from '../../lib/catalogue/filters.ts';
import { today } from '../../lib/dates.ts';
import type { CatalogueCadence } from '../../seed/catalogue.ts';
import { Row, RowList } from '../../ui/Row.tsx';
import { plural } from './text.ts';

const percent = (x: number): string => Math.round(x * 100) + ' %';

/**
 * Activity › Projects: what the catalogue has seen done, per tier and per domain; each challenge topic's solve
 * rate; and the daily-challenge streak, which is its own and never touches the study streak.
 */
export function ProjectsActivity({ atlas }: { atlas: Atlas }) {
  const entries = useCatalogueIndex();
  const events = useChallengeEvents();
  if (!entries || !events) {
    return (
      <p className="mt-6 text-meta text-ink2" role="status">
        Loading the catalogue…
      </p>
    );
  }
  const solved = solvedSet(events);
  const isDone = (id: string, kind: string): boolean => (kind === 'challenge' ? solved.has(id) : atlas.states.get(id)?.status === 'done');
  const streak = challengeStreak(events, today());
  const tiers: CatalogueCadence[] = ['daily', 'weekly', 'monthly'];
  const domains = [...new Set(entries.filter((e) => e.kind !== 'challenge').map((e) => e.group))].sort();
  const topics = [...new Set(entries.filter((e) => e.kind === 'challenge').map((e) => e.group))]
    .map((t) => {
      const all = entries.filter((e) => e.kind === 'challenge' && e.group === t);
      const done = all.filter((e) => solved.has(e.id)).length;
      return { topic: t, total: all.length, done, rate: done / all.length };
    })
    .sort((a, b) => b.rate - a.rate || a.topic.localeCompare(b.topic));
  const skipped = events.filter((e) => e.event === 'skipped').length;

  return (
    <div className="mt-6 flex flex-col gap-6">
      <p className="text-body">
        Daily challenge streak: {plural(streak.current, 'day')} · longest {plural(streak.longest, 'day')}
        {skipped > 0 ? ' · ' + plural(skipped, 'skip') : ''}
      </p>

      <RowList flat label="By tier">
        {tiers.map((tier) => {
          const mine = entries.filter((e) => e.cadence === tier);
          const done = mine.filter((e) => isDone(e.id, e.kind)).length;
          const kinds = [...new Set(mine.map((e) => e.kind))].map((k) => plural(mine.filter((e) => e.kind === k).length, k)).join(', ');
          return <Row key={tier} height={48} title={TIER_LABEL[tier]} meta={kinds} trailing={done + ' of ' + mine.length + ' done'} />;
        })}
      </RowList>

      <RowList flat label="Builds and cases by domain">
        {domains.map((d) => {
          const mine = entries.filter((e) => e.kind !== 'challenge' && e.group === d);
          const done = mine.filter((e) => isDone(e.id, e.kind)).length;
          const active = mine.filter((e) => atlas.states.get(e.id)?.status === 'active').length;
          return <Row key={d} height={48} title={groupLabel(d)} meta={active > 0 ? active + ' in progress' : undefined} trailing={done + ' of ' + mine.length} to={'/library?type=project&group=' + d} />;
        })}
      </RowList>

      <RowList flat label="Challenge topics, solved">
        {topics.map((t) => (
          <Row key={t.topic} height={48} title={groupLabel(t.topic)} meta={t.done + ' of ' + t.total} trailing={percent(t.rate)} to={'/plan/pick?cadence=daily&group=' + t.topic} />
        ))}
      </RowList>
    </div>
  );
}
