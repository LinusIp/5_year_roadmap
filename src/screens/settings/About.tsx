import { useEffect, useState } from 'react';
import { checkForUpdate, failure, resetOfflineCopy, runningVersion } from '../../pwa/register.ts';
import type { UpdateCheck } from '../../pwa/register.ts';
import { Row, RowList } from '../../ui/Row.tsx';
import { Section } from './shared.tsx';

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

  return (
    <Section id="about" title="Atlas on this device">
      <RowList>
        <Row title="Version" meta={version === undefined ? '…' : (version ?? 'Not kept offline yet')} plainTitle />
        <Row title="Check for updates" meta={result || 'Asks the site for a newer version now'} metaWraps onClick={checking ? undefined : () => void check()} />
        <Row title="Reset offline copy" meta="Drops the cached build and reloads from the site. Your data stays." metaWraps onClick={() => void resetOfflineCopy()} />
      </RowList>
    </Section>
  );
}
