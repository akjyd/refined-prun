import en from './en';
import zh from './zh';

// 当前语言。先固定为中文；以后要做切换，只改这里。
const lang: 'en' | 'zh' = 'zh';

const tables = { en, zh } as const;

type Key = keyof typeof en;

/**
 * 按键名取一段界面文字。
 * 中文表里没有这个键时，退回英文原文，所以漏翻的地方显示英文，不会显示空白。
 * 文字里的 {0}、{1} 依次换成后面传入的参数。
 */
export function t(key: Key, ...args: (string | number)[]): string {
  const table: Partial<Record<Key, string>> = tables[lang];
  const text = table[key] ?? en[key];
  return text.replace(/\{(\d+)\}/g, (match, i) => String(args[Number(i)] ?? match));
}
