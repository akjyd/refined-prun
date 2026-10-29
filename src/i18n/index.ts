import en from './en';
import zh from './zh';

// 当前语言。装进浏览器时用中文；跑测试时用英文，因为官方测试会检查英文原文。
// 以后要做切换，只改这里。
const lang = (import.meta.env.MODE === 'test' ? 'en' : 'zh') as 'en' | 'zh';

const tables = { en, zh } as const;

type Key = keyof typeof en;

/**
 * 按键名取一段界面文字。
 * 中文表里没有这个键时，退回英文原文，所以漏翻的地方显示英文，不会显示空白。
 * 文字里的 {0}、{1} 依次换成后面传入的参数。
 */
export function t(key: Key, ...args: (string | number | undefined)[]): string {
  const table: Partial<Record<Key, string>> = tables[lang];
  const text = table[key] ?? en[key];
  // 和原来的模板字符串一样：参数是 undefined 时显示 "undefined"；没传的空位保持原样。
  return text.replace(/\{(\d+)\}/g, (match, i) =>
    Number(i) < args.length ? String(args[Number(i)]) : match,
  );
}

/**
 * 显示一个数据类型名，比如动作类型 'CX Buy'。
 * 类型名本身是数据（会存进动作包），不能改；这里只改显示：有译文时显示「中文（英文）」。
 */
export function tType(type: string): string {
  const key = `type.${type}` as Key;
  if (lang === 'en' || !(key in en)) {
    return type;
  }
  return `${t(key)}（${type}）`;
}

/**
 * 显示一个有特殊含义的值，比如 'Configure on Execution'（执行时再选）。
 * 这些值会存进动作包，所以值本身不变，只换显示的文字；没有译文的值原样显示。
 */
export function tValue(value: string): string {
  const key = `value.${value}` as Key;
  if (lang === 'en' || !(key in en)) {
    return value;
  }
  return t(key);
}

/**
 * 功能开关列表里某个功能的说明。没有译文时用功能自己注册的英文说明。
 */
export function tFeature(id: string, fallback: string): string {
  if (lang === 'en') {
    return fallback;
  }
  const table: Partial<Record<string, string>> = tables.zh;
  return table[`feature.${id}`] ?? fallback;
}

type Option = string | { label: string; value: string };

/**
 * 把下拉框的选项转成「显示中文、值不变」的形式。只在模板里给 :options 用。
 */
export function tOptions(options: readonly Option[]): { label: string; value: string }[] {
  return options.map(x => (typeof x === 'string' ? { label: tValue(x), value: x } : x));
}
