import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { db } from './db/db.ts';
import { registerServiceWorker } from './pwa/register.ts';
import { peekUnits, seed } from './seed/index.ts';
import { startSync } from './sync/engine.ts';
import '@fontsource-variable/instrument-sans';
import './index.css';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// GitHub Sync: does nothing, and asks nothing of the network, until a repository is connected in Settings.
void startSync({ database: db, seed, unitTitle: (id, unitId) => peekUnits(id)?.find((u) => u.id === unitId)?.title });
