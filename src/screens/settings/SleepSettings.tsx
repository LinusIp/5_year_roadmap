import { GOAL_CHOICES, saveSleepSettings, useSleepSettings } from '../../db/sleep.ts';
import { lengthText } from '../../lib/sleep.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Section } from './shared.tsx';

/**
 * Settings › Sleep (SLEEP-LOG): the goal (6 to 10 h, in half hours; the chart's dashed line and the bedtime tile) and
 * the morning question on Today. Kept on this device, like the blog settings.
 */
export function SleepSettings() {
  const sleep = useSleepSettings();
  if (!sleep) return <Section id="sleep" title="Sleep" children={null} />;
  const index = GOAL_CHOICES.indexOf(sleep.goalMinutes);
  const setGoal = (step: number): void => {
    const next = GOAL_CHOICES[Math.min(GOAL_CHOICES.length - 1, Math.max(0, (index < 0 ? GOAL_CHOICES.indexOf(480) : index) + step))]!;
    void saveSleepSettings((s) => ({ ...s, goalMinutes: next }));
  };
  const knob = 'knob !size-11 shrink-0 rounded-knob text-ink';
  return (
    <Section id="sleep" title="Sleep">
      <RowList flat>
        <Row
          title="Goal"
          meta="The dashed line on the week chart, and the bedtime that gives it"
          action={
            <span className="flex items-center gap-2">
              <Button variant="icon" icon="minus" className={knob} label="Goal half an hour shorter" disabled={index === 0} onClick={() => setGoal(-1)} />
              <span className="well grid h-11 min-w-[76px] place-items-center rounded-[14px] px-2 text-body font-semibold tabular-nums" aria-live="polite">
                {lengthText(sleep.goalMinutes)}
              </span>
              <Button variant="icon" icon="plus" className={knob} label="Goal half an hour longer" disabled={index === GOAL_CHOICES.length - 1} onClick={() => setGoal(1)} />
            </span>
          }
        />
      </RowList>
    </Section>
  );
}
