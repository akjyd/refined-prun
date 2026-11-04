import RECIPES from '@src/features/XIT/RECIPES/RECIPES.vue';
import { t } from '@src/i18n';

xit.add({
  command: 'RECIPES',
  name: t('recipes.title'),
  description: t('recipes.description'),
  component: () => RECIPES,
});
