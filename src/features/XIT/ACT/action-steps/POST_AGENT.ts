import { act } from '@src/features/XIT/ACT/act-registry';
import { buildAgentPackageMessage } from '@src/features/XIT/ACT/agent-sync';
import { postAgentMessage } from '@src/infrastructure/prun-ui/agent-channel-messaging';
import { t } from '@src/i18n';

interface Data {
  pkg: UserData.ActionPackageData;
  // Pre-allocated id (e.g. chain member "c11-2"); omit to auto-generate.
  id?: string;
}

const maxPostAttempts = 3;
// Delay before subsequent posts and every retry to reduce flood throttling.
// The first post has no delay; no delay follows the last post.
// Retries are still needed because this gap does not guarantee server acceptance.
const postGapMs = 2000;

export const POST_AGENT = act.addActionStep<Data>({
  type: 'POST_AGENT',
  description: data => t('act.agent.post', data.pkg.global.name),
  execute: async ctx => {
    const { data, isFirstOfType, waitAct, complete, skip, log } = ctx;
    const { id, text } = await buildAgentPackageMessage(data.pkg, data.id);
    const name = data.pkg.global.name ?? 'package';
    for (let attempt = 1; attempt <= maxPostAttempts; attempt++) {
      const isRunFirstPost = isFirstOfType && attempt === 1;
      await waitAct(attempt === 1 ? undefined : t('act.agent.retry', name, id), {
        actDelayMs: isRunFirstPost ? 0 : postGapMs,
      });
      try {
        await postAgentMessage(text);
        log.info(t('act.agent.posted', id));
        complete();
        return;
      } catch (e) {
        log.error(t('act.agent.failed', name, id, e instanceof Error ? e.message : String(e)));
      }
    }
    log.error(t('act.agent.gaveUp'));
    log.label(text);
    skip({ silent: true });
  },
});
