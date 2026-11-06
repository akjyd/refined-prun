import { fioBooks, loadFioBooks } from '@src/infrastructure/fio/exchange-full';
import { recordChances, runChecks } from '@src/features/XIT/ARBLOG/arb-watch-store';
import { recordHistory } from '@src/features/XIT/ARB/arb-history-store';

// Watched arbitrage chances: record good chances each time FIO books load (XIT ARB loads them,
// and this feature every 3 hours), and check the due records every 30 minutes.
function init() {
  watch(
    () => fioBooks.loadedAt,
    loadedAt => {
      if (loadedAt > 0) {
        recordChances();
        recordHistory();
      }
    },
  );
  setInterval(() => void loadFioBooks(), 3 * 3_600_000);
  setInterval(() => void runChecks(), 30 * 60_000);
  setTimeout(() => {
    void runChecks();
    if (fioBooks.loadedAt === 0) {
      void loadFioBooks();
    }
  }, 60_000);
}

features.add(
  import.meta.url,
  init,
  'XIT ARB, ARBLOG: Records good arbitrage chances and their profit over time, and checks later whether they would have made money.',
);
