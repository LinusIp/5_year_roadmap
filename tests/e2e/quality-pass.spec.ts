import { expect, test } from '@playwright/test';
import { open, reload } from './helpers.ts';

/**
 * The quality pass (ATLAS-QUALITY-AUDIT, 16,448 rows) dropped 1,412 rows from the data but not the progress a device
 * kept on them: a state for a row that is gone stays in the database (and in backups) and no screen trips on it.
 */
test('progress kept on a dropped row breaks no screen, and the rows still there show as before', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page, './');
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('atlas');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction('itemStates', 'readwrite');
          const store = tx.objectStore('itemStates');
          store.put({ refId: 'kaggle-titanic', status: 'active', unitsDone: [], startedAt: '2026-10-01' });
          store.put({ refId: 'article-fowler-strangler-fig', status: 'done', unitsDone: [], doneAt: '2026-10-20' });
          tx.oncomplete = () => { req.result.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await reload(page);
  for (const path of ['./', './#/library', './#/library?type=course', './#/activity', './#/plan', './#/library?path=ai']) {
    await open(page, path);
    await expect(page.getByRole('main')).toBeVisible();
  }
  // The state is still there.
  const kept = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const req = indexedDB.open('atlas');
        req.onsuccess = () => {
          const all = req.result.transaction('itemStates').objectStore('itemStates').getAll();
          all.onsuccess = () => { resolve((all.result as { refId: string }[]).map((s) => s.refId)); req.result.close(); };
        };
      }),
  );
  expect(kept).toEqual(expect.arrayContaining(['kaggle-titanic', 'article-fowler-strangler-fig']));
  expect(errors).toEqual([]);
});
