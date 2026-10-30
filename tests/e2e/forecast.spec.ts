import { expect, test } from '@playwright/test';
import { DEMO_TIME, demoBackupText } from '../../scripts/lib/demo.ts';
import { FIRST_DAY, logTime, open } from './helpers.ts';

/**
 * ATLAS-FORECAST-FIX, through the real UI: eight weeks of demo history give verdicts of a few weeks at most, and a
 * fresh install with one day of logs says it is too early to tell.
 */

test('with eight weeks of history no lane is more than four weeks behind', async ({ page }) => {
  await page.clock.setFixedTime(new Date(DEMO_TIME));
  await open(page, './#/settings');
  await page.getByLabel('Backup file to import').setInputFiles({ name: 'atlas-backup-demo.json', mimeType: 'application/json', buffer: Buffer.from(demoBackupText('light')) });
  await page.getByRole('button', { name: 'Replace', exact: true }).click();
  await expect(page.getByText(/Restored \d+ records/)).toBeVisible();

  await open(page, './#/plan');
  const lanes = page.getByRole('button', { name: /^(ML Zoomcamp|GameDevHQ|Hugging Face|Coding lessons|Math and physics) / });
  await expect(lanes).toHaveCount(5);
  const texts = await lanes.allTextContents();
  for (const text of texts) {
    expect(text).not.toMatch(/months? late|Too early to tell|Plan too full/);
    const behind = /(\d+) weeks? behind/.exec(text);
    if (behind) expect(Number(behind[1])).toBeLessThanOrEqual(4);
  }
  // The lane's sheet names the month it finishes in at this pace.
  await page.getByRole('button', { name: /^GameDevHQ \d+ weeks? behind/ }).click();
  await expect(page.getByTestId('lane-forecast')).toHaveText(/^\d+ weeks? behind · finishes about [A-Z][a-z]+ 20\d\d at this pace$/);
});

test('a fresh install with one day of logs says it is too early to tell', async ({ page }) => {
  await page.clock.install({ time: new Date(FIRST_DAY) });
  await open(page, './');
  await logTime(page, '120');

  await open(page, './#/plan');
  await expect(page.getByRole('button', { name: /^GameDevHQ Too early to tell 08:00–10:00/ })).toBeVisible();
  await expect(page.getByText(/^Too early to tell: a week of logs/)).toBeVisible();
  await expect(page.getByText(/weeks? behind/)).toHaveCount(0);
  await page.getByRole('button', { name: /^GameDevHQ Too early to tell/ }).click();
  await expect(page.getByTestId('lane-forecast')).toHaveText(/^Too early to tell · finishes about/);
});
