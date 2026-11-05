import { watchArbBatches } from '@src/features/XIT/ARBLOG/arb-batch-store';

function init() {
  watchArbBatches();
}

features.add(
  import.meta.url,
  init,
  'XIT ARB: Records each buy placed from XIT ARB as an arbitrage batch and follows its sales.',
);
