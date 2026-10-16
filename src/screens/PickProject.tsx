import { useState } from 'react';
import { addPlanEdit, slugifyId } from '../db/edits.ts';
import type { NewPlanPatch } from '../db/types.ts';
import { setItemStatus, setWeekPick } from '../db/state.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { useCatalogue, useCatalogueIndex, useChallengeEvents } from '../hooks/useCatalogue.ts';
import { deckEntries, groupLabel, groupsOf, solvedSet, TIER_LABEL } from '../lib/catalogue/filters.ts';
import type { Scope } from '../lib/catalogue/filters.ts';
import { addDays, startOfWeek, today } from '../lib/dates.ts';
import { takeIntoLane } from '../lib/plan.ts';
import { effectivePhase, isOpen, monthlyPool, weeklyPool } from '../lib/schedule.ts';
import { navigate, useQueryParam } from '../router/router.tsx';
import type { CatalogueCadence } from '../seed/catalogue.ts';
import type { Project } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { Chips } from '../ui/Chips.tsx';
import { Deck } from '../ui/Deck.tsx';
import type { DeckCard } from '../ui/Deck.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { Header } from '../ui/Header.tsx';
import { Screen } from '../ui/Screen.tsx';
import { ItemSheet } from './parts/ItemSheet.tsx';
import { PickerSheet } from './parts/PickerSheet.tsx';
import { moveIntoToday, takenProject } from './parts/taken.ts';
import { partOf, plural, shortTitle } from './parts/text.ts';

const BACK: Record<string, string> = { today: '/', reviews: '/reviews' };

/**
 * "Pick a project": the deck of projects, by tier. Daily is the catalogue's easy challenges; Weekly the
 * curriculum's weekly builds that fit the phase, then the catalogue's medium builds; Monthly the
 * curriculum's monthly projects, then the catalogue's real cases. A topic or domain chip and This phase / Earlier /
 * Everything narrow it down. Taking a weekly build makes it this week's (or, from the Sunday review, next week's)
 * build in Block D; a monthly project becomes the next item of the Block D lane; a case joins the monthly queue; a
 * challenge opens. A tap on the card opens its tech doc, which has Take it too.
 */
export function PickProject() {
  const atlas = useAtlas();
  const [cadence, setCadence] = useQueryParam('cadence');
  const [scope, setScope] = useQueryParam('scope');
  const [group, setGroup] = useQueryParam('group');
  const [week] = useQueryParam('week');
  const [from] = useQueryParam('from');
  const [pickingGroup, setPickingGroup] = useState(false);
  // The card whose tech doc is open, and its element (Take it from the doc moves it into Today like the button).
  const [doc, setDoc] = useState<{ card: DeckCard; element: HTMLElement } | null>(null);
  const entries = useCatalogueIndex();
  const items = useCatalogue();
  const events = useChallengeEvents();
  const back = BACK[from ?? ''] ?? '/plan?view=projects';
  const close = (
    <Button variant="icon" icon="x" label="Close" to={back} />
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
  const tier: CatalogueCadence = cadence === 'monthly' ? 'monthly' : cadence === 'daily' ? 'daily' : 'weekly';
  const monthly = tier === 'monthly';
  const scopeValue: Scope = scope === 'all' ? 'all' : scope === 'earlier' ? 'earlier' : 'phase';
  const everyPhase = scopeValue === 'all';
  const nextWeek = week === 'next';
  const setTier = (next: string | null): void => {
    setCadence(next);
    setGroup(null);
  };

  // The curriculum's own projects come first, as before; the catalogue's follow. A topic or domain is the catalogue's.
  const curriculum: Project[] =
    tier === 'daily' || group || scopeValue === 'earlier' ? [] : monthly ? monthlyPool(everyPhase ? null : phase, ctx) : weeklyPool(everyPhase ? null : phase, ctx);
  const fromCatalogue = entries && events ? deckEntries(entries, { tier, group, scope: scopeValue }, { phases: seed.phases, current: phase, states, solved: solvedSet(events) }) : [];
  const noun = tier === 'daily' ? 'daily challenge' : monthly ? 'monthly project' : 'weekly project';
  const count = curriculum.length + fromCatalogue.length;

  const cards: DeckCard[] = [
    ...curriculum.map((p) => {
      const part = partOf(p.title);
      const track = seed.tracks.find((t) => t.id === p.tracks[0])?.name ?? p.tracks[0]!;
      return {
        id: p.id,
        // The cadence's range, as the mockup writes it, rather than one estimate.
        kind: [monthly ? 'Monthly project' : 'Weekly build', part, monthly ? '20–40 h' : '2–6 h'].filter(Boolean).join(' · '),
        type: monthly ? ('case' as const) : ('build' as const),
        title: shortTitle(p.title),
        brief: p.brief,
        footer: [track, p.source && p.source !== 'user' ? 'from ' + p.source : p.source === 'user' ? 'yours' : null].filter(Boolean).join(' · '),
      };
    }),
    ...fromCatalogue.map((e) => {
      const item = items?.find((i) => i.id === e.id);
      const brief = !item ? '' : item.kind === 'challenge' ? item.statement : item.kind === 'build' ? item.goal : item.scenario;
      const size = e.kind === 'challenge' ? e.estMinutes + ' min' : e.hours + ' h';
      const label = e.kind === 'challenge' ? TIER_LABEL[e.cadence] + ' challenge' : e.kind === 'build' ? 'Weekly build' : 'Monthly case';
      const track = seed.tracks.find((t) => t.id === e.tracks[0])?.name;
      return { id: e.id, kind: [label, e.difficulty, size].join(' · '), type: e.kind, difficulty: e.difficulty, title: e.title, brief, footer: [groupLabel(e.group), e.kind === 'challenge' ? null : track].filter(Boolean).join(' · ') };
    }),
  ];

  const take = async (card: DeckCard, element: HTMLElement): Promise<void> => {
    const entry = entries?.find((e) => e.id === card.id);
    if (entry?.kind === 'challenge') {
      navigate('/challenge/' + entry.id);
      return;
    }
    if (entry?.kind === 'case') {
      // The monthly queue: a case taken is active, and Today carries it under Block D.
      if ((states.get(entry.id)?.status ?? 'todo') === 'todo') await setItemStatus(entry.id, 'active');
      if (nextWeek) {
        navigate(back);
        return;
      }
      moveIntoToday(element, () => navigate('/'));
      return;
    }
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
    : tier === 'daily'
      ? 'Skip flicks the card away. Take it opens the challenge.'
      : monthly
        ? 'Skip flicks the card away. Take it makes it the next project in Block D.'
        : 'Skip flicks the card away. Take it puts it into Block D this week.';
  const groupNoun = tier === 'daily' ? 'Topic' : 'Domain';

  return (
    <Screen title="Pick a project">
      <Header
        title="Pick a project"
        sub={plural(count, noun) + (everyPhase ? ' left' : scopeValue === 'earlier' ? ' from earlier phases' : ' fit this phase')}
        actions={close}
      />
      <div className="mt-3 flex flex-col gap-2">
        <Chips
          label="Projects"
          items={[
            { key: 'daily', label: 'Daily', pressed: tier === 'daily', onClick: () => setTier('daily') },
            { key: 'weekly', label: 'Weekly', pressed: tier === 'weekly', onClick: () => setTier(null) },
            { key: 'monthly', label: 'Monthly', pressed: monthly, onClick: () => setTier('monthly') },
            { key: 'group', label: group ? groupLabel(group) : groupNoun, pressed: Boolean(group), chevron: true, end: true, onClick: () => setPickingGroup(true) },
          ]}
        />
        <Chips
          label="Phase"
          items={[
            { key: 'phase', label: 'This phase', pressed: scopeValue === 'phase', onClick: () => setScope(null) },
            { key: 'earlier', label: 'Earlier', pressed: scopeValue === 'earlier', onClick: () => setScope('earlier') },
            { key: 'all', label: 'Everything', pressed: everyPhase, onClick: () => setScope('all') },
          ]}
        />
      </div>
      <div className="mt-6">
        {cards.length === 0 ? (
          <EmptyState>
            {!entries
              ? 'Loading the catalogue…'
              : everyPhase
                ? 'Every ' + noun + ' is done.'
                : 'Every ' + noun + (scopeValue === 'earlier' ? ' from earlier phases' : ' for this phase') + ' is done.'}
          </EmptyState>
        ) : (
          <Deck
            key={(cadence ?? '') + (scope ?? '') + (group ?? '')}
            cards={cards}
            hint={hint}
            onTake={(card, el) => void take(card, el)}
            onOpen={(card, element) => (entries?.find((e) => e.id === card.id)?.kind === 'challenge' ? navigate('/challenge/' + card.id) : setDoc({ card, element }))}
          />
        )}
      </div>
      <ItemSheet
        atlas={atlas}
        id={doc?.card.id ?? null}
        onClose={() => setDoc(null)}
        onTake={() => {
          if (!doc) return;
          const { card, element } = doc;
          setDoc(null);
          void take(card, element);
        }}
      />
      <PickerSheet
        open={pickingGroup}
        title={groupNoun}
        searchLabel={'Search ' + groupNoun.toLowerCase() + 's'}
        value={group}
        clearLabel="Everything"
        options={(entries ? groupsOf(entries, tier) : []).map((g) => ({ value: g, label: groupLabel(g) }))}
        onPick={(v) => setGroup(v)}
        onClose={() => setPickingGroup(false)}
      />
    </Screen>
  );
}
