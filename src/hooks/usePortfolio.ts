/**
 * The portfolio (ATLAS-PORTFOLIO, data/portfolio/): its own chunk, loaded on first use and kept, so Plan's row, the
 * Library's tile, the search group and the screens read one copy. Undefined until it has loaded; null without a file.
 */
import { useEffect, useState } from 'react';
import { loadPortfolio, peekPortfolio, subscribePortfolio } from '../seed/index.ts';
import type { PortfolioSeed } from '../seed/portfolio.ts';

export function usePortfolio(enabled = true): PortfolioSeed | null | undefined {
  const [portfolio, setPortfolio] = useState<PortfolioSeed | null | undefined>(() => peekPortfolio());
  useEffect(() => {
    if (!enabled || portfolio !== undefined) return;
    const unsubscribe = subscribePortfolio(() => setPortfolio(peekPortfolio()));
    void loadPortfolio().then((loaded) => setPortfolio(loaded));
    return unsubscribe;
  }, [enabled, portfolio]);
  return portfolio;
}
