import { addPlanEdit, slugifyId } from '../db/edits.ts';
import type { NewPlanPatch } from '../db/types.ts';
import { setWeekPick } from '../db/state.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { addDays, startOfWeek, today } from '../lib/dates.ts';
import { takeIntoLane } from '../lib/plan.ts';
import { effectivePhase, isOpen, monthlyPool, weeklyPool } from '../lib/schedule.ts';
import { navigate, useQueryParam } from '../router/router.tsx';
import type { Project } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { Chips } from '../ui/Chips.tsx';
import { Deck } from '../ui/Deck.tsx';
import type { DeckCard } from '../ui/Deck.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Header } from '../ui/Header.tsx';
import { Screen } from '../ui/Screen.tsx';
import { moveIntoToday, takenProject } from './parts/taken.ts';
import { partOf, plural, shortTitle } from './parts/text.ts';

const BACK: Record<string, string> = { today: '/', reviews: '/reviews' };

/**
 * "Pick a project": the deck of projects that fit the current phase, weekly or monthly. Taking a weekly build
 * makes it this week's (or, from the Sunday review, next week's) build in Block D; taking a monthly project
 * makes it the next item of the Block D lane.
 */
export function PickProject() {
  const atlas = useAtlas();
  const [cadence, setCadence] = useQueryParam('cadence');
  const [scope, setScope] = useQueryParam('scope');
  const [week] = useQueryParam('week');
  const [from] = useQueryParam('from');
  const back = BACK[from ?? ''] ?? '/plan?view=projects';
  const close = (
    <Button variant="icon" to={back}>
      Close
    </Button>
  );

  if (!atlas) {
    return (
      <Screen title="Pick a project">
        <Header title="Pick a project" actions={close} />
      </Screen>
    );
  }

  const { seed, states, settings } = atlas;
  const now = today();
  const phase = effectivePhase(now, seed.phases);
  const ctx = { seed, states };
  const monthly = cadence === 'monthly';
  const everyPhase = scope === 'all';
  const nextWeek = week === 'next';
  const pool: Project[] = monthly ? monthlyPool(everyPhase ? null : phase, ctx) : weeklyPool(everyPhase ? null : phase, ctx);
  const noun = monthly ? 'monthly project' : 'weekly project';

  const cards: DeckCard[] = pool.map((p) => {
    const part = partOf(p.title);
    const track = seed.tracks.find((t) => t.id === p.tracks[0])?.name ?? p.tracks[0]!;
    return {
      id: p.id,
      // The cadence's range, as the mockup writes it, rather than one estimate.
      kind: [monthly ? 'Monthly project' : 'Weekly build', part, monthly ? '20–40 h' : '2–6 h'].filter(Boolean).join(' · '),
      title: shortTitle(p.title),
      brief: p.brief,
      footer: [track, p.source && p.source !== 'user' ? 'from ' + p.source : p.source === 'user' ? 'yours' : null].filter(Boolean).join(' · '),
    };
  });

  const take = async (card: DeckCard, element: HTMLElement): Promise<void> => {
    if (monthly) {
      if (!phase) return;
      const { patches, add } = takeIntoLane(seed.plan, (id) => isOpen(id, states), phase.id, 'D', card.id);
      const edit: NewPlanPatch[] = patches.map((p) => ({ op: 'move', planItemId: p.id, order: p.patch.order!, ...(p.patch.phaseId ? { phaseId: p.patch.phaseId } : {}), ...(p.patch.block ? { block: p.patch.block } : {}) }));
      if (add) {
        const id = slugifyId(card.id, new Set([...seed.plan, ...(seed.dropped ?? [])].map((i) => i.id)), 'plan');
        edit.push({ op: 'add', item: { ...add, id } });
      }
      await addPlanEdit(edit, 'Took ' + card.title);
    } else {
      await setWeekPick(startOfWeek(nextWeek ? addDays(now, 7) : now, settings.core.weekStartsOn), card.id);
    }
    if (nextWeek) {
      navigate(back);
      return;
    }
    takenProject.set(card.id, monthly ? 'monthly' : 'weekly');
    moveIntoToday(element, () => navigate('/'));
  };

  const hint = nextWeek
    ? "Skip flicks the card away. Take it makes it next week's build."
    : monthly
      ? 'Skip flicks the card away. Take it makes it the next project in Block D.'
      : 'Skip flicks the card away. Take it puts it into Block D this week.';

  return (
    <Screen title="Pick a project">
      <Header title="Pick a project" sub={plural(pool.length, noun) + (everyPhase ? ' left' : ' fit this phase')} actions={close} />
      <div className="mt-3">
        <Chips
          label="Projects"
          items={[
            { key: 'weekly', label: 'Weekly', pressed: !monthly, onClick: () => setCadence(null) },
            { key: 'monthly', label: 'Monthly', pressed: monthly, onClick: () => setCadence('monthly') },
            { key: 'phase', label: 'This phase', pressed: !everyPhase, onClick: () => setScope(everyPhase ? null : 'all') },
          ]}
        />
      </div>
      <div className="mt-9">
        {cards.length === 0 ? (
          <EmptyState>{everyPhase ? 'Every ' + noun + ' is done.' : 'Every ' + noun + ' for this phase is done.'}</EmptyState>
        ) : (
          <Deck key={(cadence ?? '') + (scope ?? '')} cards={cards} hint={hint} onTake={(card, el) => void take(card, el)} />
        )}
      </div>
    </Screen>
  );
}
