// 英文原文。键名按「命令.位置」命名，内容和官方版完全一致。
export default {
  // XIT BURN —— 命令说明
  'burn.description': 'Shows the number of days of consumables left.',
  'burn.parameters': 'Planet Identifier(s), OVERALL, NOT',

  // XIT BURN —— 顶部筛选开关
  'burn.filter.red': 'RED',
  'burn.filter.yellow': 'YELLOW',
  'burn.filter.green': 'GREEN',
  'burn.filter.inf': 'INF',
  'burn.filter.prod': 'PROD',
  'burn.filter.prodTip':
    'Toggle materials with production consumption. When off, hides materials only used in production.',
  'burn.filter.wf': 'WF',
  'burn.filter.wfTip':
    'Toggle materials with workforce consumption. When off, hides materials only consumed by workforce.',
  'burn.filter.io': 'I/O',

  // XIT BURN —— 表头
  'burn.col.inv': 'Inv',
  'burn.col.invTip':
    'Stock at the base plus cargo on inbound ships when enabled. Fractional amount represents the leftover materials since the last workforce consumption event.',
  'burn.col.in': 'In',
  'burn.col.out': 'Out',
  'burn.col.net': 'Net',
  'burn.col.burn': 'Burn',
  'burn.col.burnTip': 'How much of a material is consumed per day.',
  'burn.col.need': 'Need',
  'burn.col.needTip': 'How much of a material needs to be delivered to be fully supplied.',
  'burn.col.days': 'Days',
  'burn.col.cmd': 'CMD',

  // XIT BURN —— 其他
  'burn.overall': 'Overall',
  'burn.inbound.included': 'Includes inbound cargo. Click to exclude it.',
  'burn.inbound.excluded': 'Excludes inbound cargo. Click to include it.',

  // XIT BURNACT（BURN 里每个基地的 ACT 按钮）
  'burnact.description': 'Executes a resupply action package for a planet from the burn screen.',
  'burnact.parameters': 'Planet Identifier',
  'burnact.notFound': 'Planet "{0}" not found.',
  'burnact.returnJson': 'Generate Return JSON',
  'burnact.returnJsonToggle': 'generate return json',
  'burnact.agent': 'Agent',
  'burnact.agentToggle': 'agent',
};
