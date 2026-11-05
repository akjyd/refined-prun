import { timestampEachMinute } from '@src/utils/dayjs';
import { fixed0 } from '@src/utils/format';
import { t } from '@src/i18n';

// "12m", "3h", "2d" since the time.
export function ageText(time: number | undefined) {
  if (time === undefined) {
    return '--';
  }
  const minutes = Math.max(0, (timestampEachMinute.value - time) / 60_000);
  if (minutes < 60) {
    return t('arb.minutes', fixed0(minutes));
  }
  if (minutes < 48 * 60) {
    return t('arb.hours', fixed0(minutes / 60));
  }
  return t('arb.days', fixed0(minutes / 1440));
}
