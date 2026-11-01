import { useEffect, useState } from 'react';
import { checkForUpdate, failure, resetOfflineCopy, runningVersion } from '../../pwa/register.ts';
import type { UpdateCheck } from '../../pwa/register.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Section } from './shared.tsx';
import { QUALITY_SCALE, StarRating } from '../../ui/StarRating.tsx';
import type { Quality } from '../../ui/StarRating.tsx';

const RESULT: Record<UpdateCheck, string> = {
  ready: 'A new version is ready: tap Reload below',
  latest: 'This is the latest version',
  failed: 'The site could not be reached for a new version',
  unavailable: 'Updates come with the installed site, not the dev server',
};

/**
 * The build this device runs and the way to a newer one: a check on demand, with the reason when an install
 * fails, and the reset that drops the offline copy when a new version will not install. The user's data lives
 * in IndexedDB and stays.
 */
export function About() {
  const [version, setVersion] = useState<string | null | undefined>(undefined);
  const [result, setResult] = useState<string>('');
  const [checking, setChecking] = useState(false);
  const [resetting, setResetting] = useState<string>('');
  useEffect(() => {
    let live = true;
    void runningVersion().then((v) => {
      if (live) setVersion(v);
    });
    return () => {
      live = false;
    };
  }, []);

  const check = async (): Promise<void> => {
    setChecking(true);
    setResult('Checking…');
    const found = await checkForUpdate();
    const why = found === 'failed' ? failure() : null;
    setResult(RESULT[found] + (why ? ': ' + why : ''));
    setChecking(false);
  };

  // The reset is a button, not a row: it is the one action here that changes the device, and it says what it did.
  const reset = async (): Promise<void> => {
    setResetting('Dropping the offline copy…');
    const problem = await resetOfflineCopy();
    setResetting(problem ? 'Could not drop it all (' + problem + '); loading from the site anyway' : 'Loading from the site…');
  };

  return (
    <Section id="about" title="Atlas on this device">
      <RowList>
        <Row title="Version" meta={version === undefined ? '…' : (version ?? 'Not kept offline yet')} plainTitle />
        <Row title="Check for updates" meta={result || 'Asks the site for a newer version now'} metaWraps onClick={checking ? undefined : () => void check()} />
      </RowList>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={() => void reset()} disabled={Boolean(resetting)}>
          Reset offline copy
        </Button>
        <span className="min-w-0 flex-1 text-meta text-ink2">{resetting || 'Drops the cached build and loads the site afresh. Your data stays.'}</span>
      </div>
    </Section>
  );
}

/**
 * How quality is rated (ATLAS-STAR-RATING): the stars on the Library's rows are the audit's grade of each resource, on
 * one strict scale, never the user's own; a row the audit did not grade shows none.
 */
export function QualityNote() {
  return (
    <Section id="quality" title="How quality is rated">
      <p className="mb-3 text-meta text-ink2">
        Every resource in the Library was graded by hand on one strict 1 to 5 scale, by opening it and comparing it with the other resources on its topic. The stars show that grade. They are not a personal rating, and a resource that was not graded shows none.
      </p>
      <RowList>
        {([5, 4, 3, 2, 1] as Quality[]).map((q) => (
          <Row key={q} height={48} icon={<StarRating value={q} size="sm" />} title={QUALITY_SCALE[q].label} meta={QUALITY_SCALE[q].tip} metaWraps />
        ))}
      </RowList>
    </Section>
  );
}
