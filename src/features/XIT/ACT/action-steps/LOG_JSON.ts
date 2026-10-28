import { act } from '@src/features/XIT/ACT/act-registry';
import { t } from '@src/i18n';

interface Data {
  pkg: UserData.ActionPackageData;
}

export const LOG_JSON = act.addActionStep<Data>({
  type: 'LOG_JSON',
  description: data => t('act.json.print', data.pkg.global.name),
  execute: async ctx => {
    const { data, complete, log } = ctx;
    const name = data.pkg.global.name ?? 'package';
    log.info(t('act.json.label', name));
    log.label(JSON.stringify(data.pkg, null, 2));
    complete();
  },
});
