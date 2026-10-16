import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { db } from '../db/db.ts';
import type { PracticeAnswer } from '../db/types.ts';
import { useAtlas } from '../hooks/useAtlas.ts';
import { addDays, dayName, today as todayDate } from '../lib/dates.ts';
import { addEntry, editLog } from '../lib/logs.ts';
import { Markdown } from '../lib/markdown.tsx';
import type { MathRenderer } from '../lib/markdown.tsx';
import { markQuestion } from '../lib/practice/check.ts';
import type { Mark } from '../lib/practice/check.ts';
import { instantiate } from '../lib/practice/engine.ts';
import type { RenderedPart, RenderedQuestion } from '../lib/practice/engine.ts';
import { reviewQueue } from '../lib/practice/history.ts';
import { practiceRef, statusText, subjectProgress, subjectsDone, suggestedSubject, withFinishedSubjects } from '../lib/practice/progress.ts';
import { buildDailySet, buildTopicSet, dailySetId } from '../lib/practice/sets.ts';
import type { SetSlot } from '../lib/practice/sets.ts';
import { navigate, useQueryParam } from '../router/router.tsx';
import { loadQuestionBank, loadUnits } from '../seed/index.ts';
import type { QuestionBank } from '../seed/questions.ts';
import { Button } from '../ui/Button.tsx';
import { Header } from '../ui/Header.tsx';
import { StatusIcon, SubjectIcon } from '../ui/glyphs.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { Screen } from '../ui/Screen.tsx';
import { TextField } from '../ui/TextField.tsx';
import { plural, span } from './parts/text.ts';

/** KaTeX, with MathML alongside the drawing so screen readers read the maths. */
const renderMath: MathRenderer = (tex, display, key) => (
  <span key={key} className={display ? 'math-block' : ''} dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'htmlAndMathml', strict: 'ignore' }) }} />
);

function Maths({ source, className }: { source: string; className?: string }) {
  return <Markdown source={source} className={className} options={{ math: true, svg: true }} math={renderMath} />;
}

/** One question's state on screen. */
interface Attempt {
  inputs: string[];
  hints: number;
  revealed: boolean;
  marks: Mark[] | null;
  /** Proofs: what the user wrote, then how they graded it. */
  selfGrade?: 'right' | 'partial' | 'wrong';
  startedAt: number;
}

const freshAttempt = (parts: number): Attempt => ({ inputs: Array.from({ length: parts }, () => ''), hints: 0, revealed: false, marks: null, startedAt: Date.now() });

function OptionList({ part, value, onChange, disabled, name }: { part: RenderedPart; value: string; onChange: (v: string) => void; disabled: boolean; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-col gap-2">
      {part.options!.map((option, i) => {
        const checked = value === String(i);
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(String(i))}
            className={'flex min-h-11 items-center gap-3 rounded-knob border px-3 py-2 text-left text-body ' + (checked ? 'border-blue bg-blue-soft' : 'border-dash')}
          >
            <span aria-hidden="true" className={'grid size-5 shrink-0 place-items-center rounded-pill border ' + (checked ? 'border-blue' : 'border-ink2')}>
              {checked && <span className="size-2.5 rounded-pill bg-blue" />}
            </span>
            <Maths source={option} />
          </button>
        );
      })}
    </div>
  );
}

function inputHint(part: RenderedPart): string | undefined {
  if (part.type === 'numeric' || part.type === 'estimate') return part.units ? 'With a unit, such as ' + part.units : 'A number; fractions like 7/4 work.';
  if (part.type === 'vector') return 'Entries separated by commas: 1, -2, 3.';
  if (part.type === 'matrix') return 'Rows split by ; such as 1 2; 3 4, or [[1, 2], [3, 4]].';
  if (part.type === 'expression') return 'An expression in ' + (part.vars ?? ['x']).join(', ') + ', such as 3x^2 + sin(x).';
  return undefined;
}

function QuestionScreen({
  question,
  index,
  total,
  subjectTitle,
  topicTitle,
  reading,
  lastLabel,
  onAnswered,
  onNext,
}: {
  question: RenderedQuestion;
  index: number;
  total: number;
  subjectTitle: string;
  topicTitle: string;
  /** Resources mapped to this topic, offered under the solution. */
  reading: { id: string; title: string }[];
  /** The button after the last question: "See the summary", or back to the subjects. */
  lastLabel: string;
  onAnswered: (a: Attempt, result: PracticeAnswer['result'], followed: boolean) => void;
  onNext: () => void;
}) {
  const [attempt, setAttempt] = useState<Attempt>(() => freshAttempt(question.parts.length));
  const proof = question.type === 'proof';
  const answered = proof ? attempt.selfGrade !== undefined : attempt.marks !== null && attempt.marks.every((m) => !m.message);
  const showSolution = attempt.revealed || answered;
  const set = (i: number, v: string): void => setAttempt((a) => ({ ...a, inputs: a.inputs.map((x, k) => (k === i ? v : x)) }));

  const check = (): void => {
    const marks = markQuestion(question, attempt.inputs);
    const next = { ...attempt, marks };
    setAttempt(next);
    if (marks.some((m) => m.message)) return;
    const right = marks.filter((m) => m.correct).length;
    const result: PracticeAnswer['result'] = right === marks.length ? 'right' : right > 0 ? 'partial' : 'wrong';
    onAnswered(next, result, marks.some((m) => m.followed));
  };
  const grade = (selfGrade: 'right' | 'partial' | 'wrong'): void => {
    const next = { ...attempt, selfGrade, revealed: true };
    setAttempt(next);
    onAnswered({ ...next, revealed: false }, selfGrade, false);
  };

  let primary: ReactNode;
  if (answered) {
    primary = (
      <Button variant="filled" onClick={onNext}>
        {index + 1 === total ? lastLabel : 'Next'}
      </Button>
    );
  } else if (proof) {
    primary = attempt.revealed ? null : (
      <Button variant="filled" onClick={() => setAttempt((a) => ({ ...a, revealed: true }))}>
        Show the solution
      </Button>
    );
  } else {
    // Once the solution is shown, the answer counts as missed: checking it then would only copy the solution.
    primary = attempt.revealed ? (
      <Button
        variant="filled"
        onClick={() => {
          const next = { ...attempt, marks: question.parts.map(() => ({ correct: false })) };
          setAttempt(next);
          onAnswered(next, 'wrong', false);
        }}
      >
        Count it as missed
      </Button>
    ) : (
      <Button variant="filled" onClick={check}>
        Check
      </Button>
    );
  }

  const correct = attempt.marks && !attempt.marks.some((m) => m.message) ? attempt.marks.every((m) => m.correct) : null;
  return (
    <section aria-labelledby="question-heading" className="mt-6 flex flex-col gap-4">
      <p className="text-meta text-ink2">
        Question {index + 1} of {total} · {subjectTitle} · {topicTitle}
      </p>
      <h2 id="question-heading" className="sr-only">
        Question {index + 1}
      </h2>
      <div className="tile p-[18px] text-body">
        <Maths source={question.prompt} className="doc-text" />
      </div>

      {question.parts.map((part, i) => {
        const mark = attempt.marks?.[i];
        const label = question.parts.length > 1 ? 'Answer to part ' + (i + 1) : 'Your answer';
        return (
          <div key={i} className="flex flex-col gap-2">
            {question.parts.length > 1 && <Maths source={part.prompt} className="text-body" />}
            {part.type === 'mc' ? (
              <OptionList part={part} name={label} value={attempt.inputs[i] ?? ''} onChange={(v) => set(i, v)} disabled={answered || attempt.revealed} />
            ) : (
              <TextField label={label} value={attempt.inputs[i] ?? ''} onChange={(v) => set(i, v)} hint={inputHint(part)} error={mark?.message ?? null} onKeyDown={(e) => e.key === 'Enter' && !answered && !attempt.revealed && check()} />
            )}
            {mark && !mark.message && (
              <p className="text-meta font-medium">{mark.correct ? (mark.followed ? 'Right, given your answer above: it follows from it.' : 'Right.') : 'Not quite.'}</p>
            )}
          </div>
        );
      })}

      {proof && !attempt.revealed && <TextField label="Your answer" multiline rows={4} value={attempt.inputs[0] ?? ''} onChange={(v) => set(0, v)} hint="Write it out, then compare with the solution." />}

      {attempt.hints > 0 && (
        <ol className="flex flex-col gap-2" aria-label="Hints">
          {question.hints.slice(0, attempt.hints).map((h, i) => (
            <li key={i} className="knob rounded-knob p-3 text-body">
              <span className="text-meta text-ink2">Hint {i + 1}. </span>
              <Maths source={h} />
            </li>
          ))}
        </ol>
      )}

      {correct !== null && <p className="text-body font-medium">{correct ? 'Correct.' : 'The worked solution is below.'}</p>}

      {showSolution && (
        <div className="tile p-[18px] text-body" aria-label="Solution" role="region">
          <h3 className="section-label">Solution</h3>
          <Maths source={question.solution} className="doc-text" />
          {reading.length > 0 && (
            <p className="mt-3 text-meta text-ink2">
              More on this topic:{' '}
              {reading.map((r, i) => (
                <span key={r.id}>
                  {i > 0 && ', '}
                  <a className="underline" href={'#/library/' + r.id}>
                    {r.title}
                  </a>
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {proof && attempt.revealed && !answered && (
        <div className="flex flex-col gap-2">
          <p className="text-body">How did yours compare?</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => grade('right')}>Got it</Button>
            <Button onClick={() => grade('partial')}>Partly</Button>
            <Button onClick={() => grade('wrong')}>Missed it</Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {primary}
        {!answered && !attempt.revealed && attempt.hints < question.hints.length && (
          <Button icon="hint" onClick={() => setAttempt((a) => ({ ...a, hints: a.hints + 1 }))}>{attempt.hints === 0 ? 'Hint' : 'Another hint'}</Button>
        )}
        {!answered && !attempt.revealed && !proof && (
          <Button variant="icon" onClick={() => setAttempt((a) => ({ ...a, revealed: true }))}>
            Show solution
          </Button>
        )}
      </div>
    </section>
  );
}

function Summary({ bank, slots, answers, setId, onDone, done, daily }: { bank: QuestionBank; slots: SetSlot[]; answers: PracticeAnswer[]; setId: string; onDone: () => void; done: boolean; daily: boolean }) {
  const mine = answers.filter((a) => a.set === setId);
  const right = mine.filter((a) => a.result === 'right' && !a.revealed).length;
  const seconds = mine.reduce((s, a) => s + a.seconds, 0);
  const topics = [...new Set(slots.map((s) => s.question.topic))].map((t) => bank.subjects.flatMap((s) => s.topics).find((x) => x.id === t)?.title ?? t);
  const queue = [...reviewQueue(answers).values()].filter((r) => mine.some((a) => a.questionId === r.questionId));
  const byDay = new Map<string, number>();
  for (const r of queue) byDay.set(r.due, (byDay.get(r.due) ?? 0) + 1);
  const today = todayDate();
  const when = (d: string): string => (d === addDays(today, 1) ? 'tomorrow' : 'on ' + dayName(d) + ' ' + Number(d.slice(8, 10)));
  return (
    <section aria-labelledby="summary-heading" className="mt-6 flex flex-col gap-4">
      <h2 id="summary-heading" className="text-headline font-semibold">
        {right} of {plural(slots.length, 'question')} right
      </h2>
      <p className="text-body text-ink2">
        {span(Math.max(1, Math.round(seconds / 60)))} · {topics.join(', ')}
      </p>
      <RowList label="Coming back for review">
        {queue.length === 0 ? (
          <Row title="Nothing: every answer was right." />
        ) : (
          [...byDay.entries()].sort().map(([d, n]) => <Row key={d} title={plural(n, 'question') + ' ' + when(d)} />)
        )}
      </RowList>
      <div>
        <Button variant="filled" onClick={onDone} aria-disabled={done || undefined}>
          {done ? 'Logged' : 'Done'}
        </Button>
        <p className="mt-2 text-meta text-ink2">
          {daily ? 'Each subject’s minutes went to the Practice block, and only to it, as you finished the subject.' : 'Done logs the time to the Practice block, and only to it.'}
        </p>
      </div>
    </section>
  );
}

/** Library › Practice: a subject and a topic, and how many questions. */
function Chooser({ bank }: { bank: QuestionBank }) {
  return (
    <div className="mt-6 flex flex-col gap-6">
      {bank.subjects.map((s) => (
        <RowList key={s.id} label={s.title + ' · ' + s.level}>
          {s.topics.map((t) => {
            const n = bank.questions.filter((q) => q.subject === s.id && q.topic === t.id).length;
            return <Row key={t.id} title={t.title} meta={plural(n, 'question')} to={'/practice?topic=' + s.id + '/' + t.id + '&n=10'} />;
          })}
        </RowList>
      ))}
    </div>
  );
}

/**
 * Practice. Today's set opens on a start screen: one row a subject with its status, the subjects done in any order
 * and separately across the day. A subject runs its questions one a screen and comes back to the start screen; its
 * minutes go to the Practice block as soon as it is finished, and once every subject is, the start screen becomes
 * the day's summary. Practice on demand (Library › Practice) runs straight through to its summary, whose Done logs
 * the time. Check is the one filled button; hints come one at a time; the solution can be shown at any point, and
 * then the answer counts as missed.
 */
export function Practice() {
  const atlas = useAtlas();
  const [topicParam] = useQueryParam('topic');
  const [nParam] = useQueryParam('n');
  const [choose] = useQueryParam('choose');
  const [subjectParam] = useQueryParam('subject');
  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [follow, setFollow] = useState<string[] | null>(null);
  const answers = useLiveQuery(() => db.practice.toArray(), []);
  const date = todayDate();
  const [position, setPosition] = useState<{ key: string; index: number } | null>(null);
  const [loggedSet, setLoggedSet] = useState<string | null>(null);
  // Opening another subject (or the start screen) starts from that subject's first open question.
  const [seenSubject, setSeenSubject] = useState(subjectParam);
  if (seenSubject !== subjectParam) {
    setSeenSubject(subjectParam);
    setPosition(null);
  }
  const topicSeed = useRef(String(Date.now()));

  useEffect(() => {
    void loadQuestionBank().then(setBank);
    void loadUnits('mit-18-06').then((u) => setFollow(u.map((x) => x.id)));
  }, []);

  const [subjectId, topicId] = topicParam ? (topicParam.split('/') as [string, string]) : [null, null];
  const setId = subjectId ? 'topic:' + subjectId + '/' + topicId + ':' + topicSeed.current : dailySetId(date);
  // The set is built once from the answers before today (or before this session), so answering does not reshuffle it.
  const before = useMemo(() => answers?.filter((a) => a.date < date) ?? null, [answers === undefined, date]); // eslint-disable-line react-hooks/exhaustive-deps
  const slots = useMemo(() => {
    if (!bank || !before || !atlas || follow === null) return null;
    if (subjectId && topicId) return buildTopicSet(bank, before, subjectId, topicId, Math.min(20, Math.max(1, Number(nParam) || 10)), topicSeed.current);
    const follows: Record<string, { units: string[]; done: string[] }> = {};
    for (const s of bank.subjects) if (s.follows) follows[s.id] = { units: s.follows === 'mit-18-06' ? follow : [], done: atlas.states.get(s.follows)?.unitsDone ?? [] };
    return buildDailySet({ bank, answers: before, date, perSubject: atlas.settings.core.practice.perSubject, follows });
  }, [bank, before, atlas?.settings.core.practice.perSubject, follow, subjectId, topicId, nParam, date]); // eslint-disable-line react-hooks/exhaustive-deps
  const questions = useMemo(() => slots?.map((s) => instantiate(s.question, setId)) ?? null, [slots, setId]);

  if (!atlas || !bank || !answers || !slots || !questions) {
    return (
      <Screen title="Practice">
        <Header title="Practice" />
        <p className="pt-6 text-meta text-ink2" role="status">
          Loading the questions…
        </p>
      </Screen>
    );
  }

  const settings = atlas.settings;
  const close = (
    <Button variant="icon" to={subjectId || choose ? '/library' : '/'}>
      Close
    </Button>
  );
  if (choose && !subjectId) {
    return (
      <Screen title="Practice">
        <Header title="Practice" sub="Ten questions on any topic, whenever you like." actions={close} />
        <Chooser bank={bank} />
      </Screen>
    );
  }

  const inPeriod = date >= settings.core.practice.start && date <= settings.core.practice.end;
  if (!subjectId && !inPeriod) {
    return (
      <Screen title="Practice">
        <Header title="Practice" actions={close} />
        <p className="mt-6 text-body">No daily set today: the practice period runs from {settings.core.practice.start} to {settings.core.practice.end}.</p>
        <Button className="mt-4" to="/practice?choose=1">
          Practise a topic
        </Button>
      </Screen>
    );
  }

  const subjectOf = (id: string) => bank.subjects.find((s) => s.id === id);
  const daily = !subjectId;
  const practiceBlock = settings.core.blocks.find((b) => b.role === 'practice')?.id ?? 'P';
  const trackOf = (subject: string) => subjectOf(subject)?.tracks[0] ?? 'math';
  const progress = subjectProgress(slots, answers, setId);

  const record = async (slot: SetSlot, attempt: Attempt, result: PracticeAnswer['result'], followed: boolean): Promise<void> => {
    const row: PracticeAnswer = {
      id: setId + '|' + slot.question.id,
      questionId: slot.question.id,
      subject: slot.question.subject,
      topic: slot.question.topic,
      date,
      set: setId,
      role: slot.role,
      result,
      hints: attempt.hints,
      seconds: Math.round((Date.now() - attempt.startedAt) / 1000),
      difficulty: slot.question.difficulty,
    };
    if (attempt.revealed) row.revealed = true;
    if (followed) row.followed = true;
    await db.practice.put(row);
    if (!daily) return;
    // A subject's last answer logs its minutes to the Practice block at once; the third subject also marks it done.
    const after = subjectProgress(slots, [...answers.filter((a) => a.id !== row.id), row], setId);
    if (after.find((p) => p.subject === slot.question.subject)?.status !== 'done') return;
    await editLog(date, (log) => withFinishedSubjects(log, after, practiceBlock, trackOf));
  };

  /** Practice on demand: Done logs the whole set's minutes, by subject. */
  const done = async (): Promise<void> => {
    if (daily) {
      navigate('/');
      return;
    }
    const mine = answers.filter((a) => a.set === setId);
    const bySubject = new Map<string, number>();
    for (const a of mine) bySubject.set(a.subject, (bySubject.get(a.subject) ?? 0) + a.seconds);
    await editLog(date, (log) => {
      let next = log;
      for (const [subject, seconds] of bySubject) next = addEntry(next, { block: practiceBlock, track: trackOf(subject), minutes: Math.max(1, Math.round(seconds / 60)), refId: practiceRef(subject) });
      return next;
    });
    setLoggedSet(setId);
    navigate('/library');
  };

  const readingFor = (slot: SetSlot) =>
    atlas.seed.resources
      .filter((r) => r.practiceTopics?.includes(slot.question.subject + '/' + slot.question.topic))
      .slice(0, 3)
      .map((r) => ({ id: r.id, title: r.short ?? r.title }));
  const questionScreen = (list: SetSlot[], index: number, lastLabel: string, onLast: () => void) => {
    const slot = list[index]!;
    const question = questions[slots.indexOf(slot)]!;
    const subject = subjectOf(slot.question.subject)!;
    return (
      <QuestionScreen
        key={setId + slot.question.id}
        question={question}
        index={index}
        total={list.length}
        subjectTitle={subject.short}
        topicTitle={subject.topics.find((t) => t.id === slot.question.topic)?.title ?? slot.question.topic}
        reading={readingFor(slot)}
        lastLabel={lastLabel}
        onAnswered={(attempt, result, followed) => {
          // Stay on this question (with its solution) until Next, though the first open one has moved on.
          setPosition({ key: subjectParam ?? '', index });
          void record(slot, attempt, result, followed);
        }}
        onNext={() => (index + 1 < list.length ? setPosition({ key: subjectParam ?? '', index: index + 1 }) : onLast())}
      />
    );
  };

  if (!daily) {
    const answeredIds = new Set(answers.filter((a) => a.set === setId).map((a) => a.questionId));
    const firstOpen = slots.findIndex((s) => !answeredIds.has(s.question.id));
    const index = position?.key === '' ? position.index : firstOpen < 0 ? slots.length : firstOpen;
    return (
      <Screen title="Practice">
        <Header title={subjectOf(subjectId ?? '')?.topics.find((t) => t.id === topicId)?.title ?? 'Practice'} sub={plural(slots.length, 'question')} actions={close} />
        {index < slots.length ? (
          questionScreen(slots, index, 'See the summary', () => setPosition({ key: '', index: slots.length }))
        ) : (
          <Summary bank={bank} slots={slots} answers={answers} setId={setId} daily={false} done={loggedSet === setId} onDone={() => void done()} />
        )}
      </Screen>
    );
  }

  // Today's set, one subject at a time, in the order the user picks.
  const current = subjectParam ? progress.find((p) => p.subject === subjectParam) : undefined;
  const finished = subjectsDone(progress);
  if (current) {
    const index = position?.key === current.subject ? position.index : current.next;
    if (index < current.total) {
      const othersOpen = progress.some((p) => p.subject !== current.subject && p.status !== 'done');
      return (
        <Screen title="Practice">
          <Header
            title="Practice"
            sub={subjectOf(current.subject)!.short + ' · ' + plural(current.total, 'question')}
            actions={
              <Button variant="icon" to="/practice">
                Close
              </Button>
            }
          />
          {questionScreen(current.slots, index, othersOpen ? 'Back to the subjects' : 'See the summary', () => navigate('/practice'))}
        </Screen>
      );
    }
  }

  const suggested = suggestedSubject(progress, settings.core.practice.startWith);
  const suggestedProgress = progress.find((p) => p.subject === suggested);
  return (
    <Screen title="Practice">
      <Header title="Practice" sub={finished === progress.length ? 'Every subject done today' : finished + ' of ' + plural(progress.length, 'subject') + ' done · any order'} actions={close} />
      {finished === progress.length ? (
        <Summary bank={bank} slots={slots} answers={answers} setId={setId} daily done={false} onDone={() => void done()} />
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          <RowList label="Today’s subjects">
            {progress.map((p) => (
              <Row
                key={p.subject}
                icon={<SubjectIcon subject={p.subject} />}
                title={subjectOf(p.subject)?.short ?? p.subject}
                meta={plural(p.total, 'question') + ' · ~' + p.estMinutes + ' min'}
                trailing={
                  <>
                    <StatusIcon status={p.status === 'done' ? 'done' : p.status === 'partial' ? 'active' : 'todo'} />
                    {statusText(p)}
                  </>
                }
                to={'/practice?subject=' + p.subject}
              />
            ))}
          </RowList>
          {suggested && suggestedProgress && (
            <div>
              <Button variant="filled" icon="play" to={'/practice?subject=' + suggested}>
                {(suggestedProgress.status === 'partial' ? 'Go on with ' : 'Start ') + (subjectOf(suggested)?.short.toLowerCase() ?? suggested)}
              </Button>
              <p className="mt-3 text-meta text-ink2">Each subject’s minutes go to the Practice block as soon as you finish it.</p>
            </div>
          )}
        </div>
      )}
    </Screen>
  );
}
