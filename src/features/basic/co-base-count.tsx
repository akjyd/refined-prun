import Passive from '@src/components/forms/Passive.vue';
import { t } from '@src/i18n';

function onTileReady(tile: PrunTile) {
  const basesText = L.CompanyPanel.data.bases();
  subscribe($$(tile.anchor, C.FormComponent.containerPassive), async container => {
    const label = await $(container, 'label');
    if (label.textContent !== basesText) {
      return;
    }
    const bases = await $(container, C.StaticInput.static);
    createFragmentApp(() => (
      <Passive label={t('feat.co.baseCount')}>
        <span>{bases.childElementCount}</span>
      </Passive>
    )).before(container);
  });
}

function init() {
  tiles.observe('CO', onTileReady);
}

features.add(import.meta.url, init, 'CO: Adds a "Base Count" row.');
