import type { Atlas } from '../../hooks/useAtlas.ts';
import { today as todayDate } from '../../lib/dates.ts';
import { reviewQueue, score, topicStats } from '../../lib/practice/history.ts';
import { Button } from '../../ui/Button.tsx';
import { EmptyState } from '../../ui/EmptyState.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { plural, span } from './text.ts';

const percent = (x: number): string => Math.round(x * 100) + ' %';

/**
 * Activity › Practice: accuracy per subject and per topic, the five weakest topics (each one tap from ten more
 * questions), the reviews due, and the minutes the Practice block has logged.
 */
export function PracticeActivity({ atlas }: { atlas: Atlas }) {
  const subjects = atlas.seed.practiceSubjects ?? [];
  const answers = atlas.practice;
  const now = todayDate();
  const block = atlas.settings.core.blocks.find((b) => b.role === 'practice')?.id ?? 'P';
  const minutes = atlas.logs.reduce((sum, log) => sum + log.entries.filter((e) => e.block === block).reduce((s, e) => s + e.minutes, 0), 0);

  if (answers.length === 0) {
    return <EmptyState action={<Button to="/practice?choose=1">Practise a topic</Button>}>No questions answered yet. Today's set is on Today, under Practice, from {atlas.settings.core.practice.start}.</EmptyState>;
  }

  const stats = topicStats(subjects, answers);
  const due = [...reviewQueue(answers).values()].filter((r) => r.due <= now);
  const titleOf = (subject: string, topic: string): string => subjects.find((s) => s.id === subject)?.topics.find((t) => t.id === topic)?.title ?? topic;
  const weakest = stats
    .filter((t) => t.answered > 0)
    .sort((a, b) => a.accuracy - b.accuracy || a.rating - b.rating)
    .slice(0, 5);
  const overall = answers.reduce((s, a) => s + score(a), 0) / answers.length;

  return (
    <div className="mt-6 flex flex-col gap-6">
      <p className="text-body">
        {plural(answers.length, 'question')} answered · {percent(overall)} right · {span(minutes)} in the Practice block
      </p>

      <RowList flat label="By subject">
        {subjects.map((s) => {
          const mine = answers.filter((a) => a.subject === s.id);
          const accuracy = mine.length ? mine.reduce((sum, a) => sum + score(a), 0) / mine.length : 0;
          const done = stats.filter((t) => t.subject === s.id && t.done).length;
          return <Row key={s.id} height={48} title={s.title} meta={plural(mine.length, 'answer') + ' · ' + done + ' of ' + plural(s.topics.length, 'topic') + ' done'} trailing={mine.length ? percent(accuracy) : '–'} />;
        })}
      </RowList>

      <RowList flat label="Weakest topics">
        {weakest.map((t) => (
          <Row
            key={t.subject + t.topic}
            height={48}
            title={titleOf(t.subject, t.topic)}
            meta={plural(t.answered, 'answer') + ' · level ' + Math.max(1, Math.min(5, Math.round((t.rating - 900) / 150)))}
            trailing={percent(t.accuracy)}
            to={'/practice?topic=' + t.subject + '/' + t.topic + '&n=10'}
          />
        ))}
      </RowList>

      <RowList flat label="Reviews due">
        {due.length === 0 ? (
          <Row height={48} title="None due today" />
        ) : (
          subjects
            .map((s) => ({
              s,
              n: due.filter((r) => r.subject === s.id).length,
            }))
            .filter((x) => x.n > 0)
            .map(({ s, n }) => <Row key={s.id} height={48} title={s.title} meta="In the next daily set" trailing={String(n)} />)
        )}
      </RowList>

      <RowList flat label="Every topic">
        {stats
          .filter((t) => t.answered > 0)
          .map((t) => (
            <Row
              key={t.subject + t.topic}
              height={48}
              title={titleOf(t.subject, t.topic)}
              meta={plural(t.answered, 'answer') + (t.done ? ' · done' : '')}
              trailing={percent(t.accuracy)}
              to={'/practice?topic=' + t.subject + '/' + t.topic + '&n=10'}
            />
          ))}
      </RowList>
    </div>
  );
}
