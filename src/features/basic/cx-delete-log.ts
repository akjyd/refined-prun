import { watchCxDeletions } from '@src/features/XIT/CXDEL/cx-delete-store';

function init() {
  watchCxDeletions();
}

features.add(
  import.meta.url,
  init,
  'XIT CXDEL: Records every deletion of an open CX order, to count deletions per day.',
);
