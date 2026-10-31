import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { db } from './db/db.ts';
import { persistDailySchedule } from './db/settings.ts';
import { seedChecklistProgress } from './db/checklist.ts';
import { registerServiceWorker } from './pwa/register.ts';
import { peekUnits, seed } from './seed/index.ts';
import { startSync } from './sync/engine.ts';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import '@fontsource/nunito/latin-ext-600.css';
import '@fontsource/nunito/latin-ext-700.css';
import '@fontsource/nunito/latin-ext-800.css';
import '@fontsource/nunito/latin-ext-900.css';
import './index.css';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// GitHub Sync: does nothing, and asks nothing of the network, until a repository is connected in Settings.
// Settings from before the fixed daily schedule switch to it once, before sync sends them anywhere.
void persistDailySchedule(seed.settings).catch(() => undefined);
// A lesson checklist's progress as its file has it (ML Zoomcamp: 1.1 to 1.6 done), once, never over a tick.
void seedChecklistProgress(seed).catch(() => undefined);
void startSync({ database: db, seed, unitTitle: (id, unitId) => peekUnits(id)?.find((u) => u.id === unitId)?.title });
