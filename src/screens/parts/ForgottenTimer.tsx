import { useEffect, useState } from 'react';
import { checkForgotten, keepTimer, markUsed, stopTimer, useRunningTimer } from '../../db/timer.ts';
import { formatClock } from '../../lib/dates.ts';
import type { ForgottenTimer as Forgotten } from '../../lib/timer.ts';
import { seed } from '../../seed/index.ts';
import { Button } from '../../ui/Button.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { blockShort } from './text.ts';

/**
 * A timer left running: on open (and on coming back to the tab), after three hours or past midnight, "Still
 * working on Core? You started at 14:10", with Keep, Stop at the last time the app was used, and Stop now. Mounted
 * once, at the top of the app, so it asks whatever screen opens. Using the app also marks it as used.
 */
export function ForgottenTimer({ blocks, clock }: { blocks: { id: string; name: string }[]; clock: '24' | '12' }) {
  const timer = useRunningTimer();
  const [asked, setAsked] = useState<Forgotten | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async (): Promise<void> => {
      // Read what to ask before this visit counts as using the app.
      const found = await checkForgotten();
      if (alive) setAsked(found);
      await markUsed();
    };
    void check();
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') void check();
    };
    const onUse = (): void => void markUsed();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pointerdown', onUse, { passive: true });
    window.addEventListener('keydown', onUse);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointerdown', onUse);
      window.removeEventListener('keydown', onUse);
    };
  }, []);

  const open = Boolean(asked && timer && timer.startedAt === asked.startedAt);
  const name = timer ? blockShort(blocks.find((b) => b.id === timer.block)?.name ?? seed.settings.blocks.find((b) => b.id === timer.block)?.name ?? timer.block) : '';
  const at = (ms: number): string => formatClock(new Date(ms), clock);
  const close = (): void => setAsked(null);

  return (
    <Sheet open={open} title={'Still working on ' + name + '?'} onClose={close}>
      {asked && (
        <>
          <p className="text-body text-ink2">
            You started at {at(asked.startedAt)}
            {asked.reason === 'midnight' ? ', yesterday or earlier.' : '.'} The timer is still running.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                void keepTimer();
                close();
              }}
            >
              Keep
            </Button>
            {asked.lastUsedAt && (
              <Button
                variant="ice"
                onClick={() => {
                  void stopTimer(asked.lastUsedAt);
                  close();
                }}
              >
                {'Stop at ' + at(asked.lastUsedAt)}
              </Button>
            )}
            <Button
              variant="filled"
              onClick={() => {
                void stopTimer();
                close();
              }}
            >
              Stop now
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
