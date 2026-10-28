import type en from './en';

// 中文译文。键名和 en.ts 一一对应；少写的键会自动显示英文。
// 命令名（BS、INV、ACT、CXM）和物资代码不翻译。
const zh: Partial<Record<keyof typeof en, string>> = {
  'burn.description': '显示消耗品还能维持几天。',
  'burn.parameters': '星球编号（可多个）、OVERALL、NOT',

  'burn.filter.red': '红',
  'burn.filter.yellow': '黄',
  'burn.filter.green': '绿',
  'burn.filter.inf': '无限',
  'burn.filter.prod': '生产',
  'burn.filter.prodTip': '显示或隐藏有生产消耗的物资。关闭时，只用于生产的物资会被隐藏。',
  'burn.filter.wf': '工人',
  'burn.filter.wfTip': '显示或隐藏有工人消耗的物资。关闭时，只被工人消耗的物资会被隐藏。',
  'burn.filter.io': '进/出',

  'burn.col.inv': '库存',
  'burn.col.invTip':
    '基地库存；开启时还包括正在飞来的船上的货物。小数部分是上次工人消耗之后剩下的零头。',
  'burn.col.in': '消耗',
  'burn.col.out': '产出',
  'burn.col.net': '净值',
  'burn.col.burn': '日耗',
  'burn.col.burnTip': '这种物资每天消耗多少。',
  'burn.col.need': '需补',
  'burn.col.needTip': '要补满到目标天数，这种物资还需要运来多少。',
  'burn.col.days': '天数',
  'burn.col.cmd': '命令',

  'burn.overall': '合计',
  'burn.inbound.included': '已计入在途货物。点击排除。',
  'burn.inbound.excluded': '未计入在途货物。点击计入。',

  'burnact.description': '在 BURN 界面为某个星球执行补给动作包。',
  'burnact.parameters': '星球编号',
  'burnact.notFound': '找不到星球“{0}”。',
  'burnact.returnJson': '生成返程 JSON',
  'burnact.returnJsonToggle': '生成返程 json',
  'burnact.agent': '代理',
  'burnact.agentToggle': '代理',
};

export default zh;
