/**
 * The internship goals (INTERNSHIPS, data/internships*.json): their own chunk, loaded on first use and kept, so Today's
 * card, Plan's row and the screen read one copy. Null until it has loaded.
 */
import { useEffect, useState } from 'react';
import { useInternProgressAll } from '../db/internships.ts';
import { EMPTY_PROGRESS, goalName, todayCard } from '../lib/internships.ts';
import type { TodayCard } from '../lib/internships.ts';
import { loadInternships, peekInternships, subscribeInternships } from '../seed/index.ts';
import type { InternshipGoal } from '../seed/internships.ts';

export function useInternships(): InternshipGoal[] | null {
  const [goals, setGoals] = useState<InternshipGoal[] | null>(() => peekInternships());
  useEffect(() => {
    if (goals) return;
    const unsubscribe = subscribeInternships(() => setGoals(peekInternships()));
    void loadInternships().then((loaded) => setGoals(loaded));
    return unsubscribe;
  }, [goals]);
  return goals;
}

export interface InternSummary {
  goal: InternshipGoal;
  /** "NVIDIA 2027". */
  name: string;
  /** Today's card, while a target has an upcoming apply date. */
  card: TodayCard | null;
}

/** Every goal with its card for the day: Today's card and Plan's row. Null until the goals and the progress have loaded. */
export function useInternSummaries(today: string): InternSummary[] | null {
  const goals = useInternships();
  const progress = useInternProgressAll(goals ? goals.map((g) => g.goal.id) : []);
  if (!goals || !progress) return null;
  return goals.map((goal) => ({ goal, name: goalName(goal), card: todayCard(goal, progress.get(goal.goal.id) ?? EMPTY_PROGRESS, today) }));
}
