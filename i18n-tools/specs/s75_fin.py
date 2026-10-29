import re, subprocess
from tr import S, E, R, ROOT, BASE

X = 'src/features/XIT/'


def base(f):
    return subprocess.run(['git', '-C', ROOT, 'show', f'{BASE}:{f}'], capture_output=True, text=True, check=True).stdout


def block(f, start, end):
    """Text in the base file from `start` up to and including `end`."""
    src = base(f)
    a = src.index(start)
    b = src.index(end, a) + len(end)
    return src[a:b]


# Accounting terms shared by FINBS rows and FINCH chart labels.
TERMS = {
    'Current Assets': '流动资产',
    'Non-Current Assets': '非流动资产',
    'Current Liabilities': '流动负债',
    'Non-Current Liabilities': '非流动负债',
    'Total Assets': '总资产',
    'Total Liabilities': '总负债',
    'Equity': '权益',
    'Cash and Cash Equivalents': '现金及现金等价物',
    'Cash': '现金',
    'Deposits': '挂单冻结资金',
    'CX': '商品交易所（CX）',
    'FX': '外汇交易所（FX）',
    'MM Materials': '做市商物资',
    'Accounts Receivable': '应收账款',
    'Loans Receivable': '应收贷款',
    'Principal': '本金',
    'Interest': '利息',
    'Inventory': '存货',
    'CX-Listed Materials': '交易所卖单中的物资',
    'CX Inventory': '交易所仓库存货',
    'Materials in Transit': '在途物资',
    'Base Inventory': '基地存货',
    'Finished Goods': '产成品',
    'Work-in-Progress (WIP)': '在制品',
    'Raw Materials': '生产原料',
    'Workforce Consumables': '工人消耗品',
    'Other Items': '其他物品',
    'Fuel Tanks': '燃料舱',
    'Materials Receivable': '应收物资',
    'Buildings, net': '建筑（净值）',
    'Market Value': '市值',
    'Infrastructure': '基础设施',
    'Resource Extraction': '资源开采',
    'Production': '生产',
    'Acc. Depreciation': '累计折旧',
    'Ships, net': '船（净值）',
    'Long-Term Receivables': '长期应收',
    'Loans Principal': '贷款本金',
    'Intangible Assets': '无形资产',
    'HQ Upgrades': '总部升级',
    'APEX Representation Center': 'APEX 代表中心（ARC）',
    'Accounts Payable': '应付账款',
    'Materials Payable': '应付物资',
    'Loans Payable': '应付贷款',
    'Long-Term Payables': '长期应付',
    # Chart-only labels (FINCH) that combine a parent and a child.
    'Equity (Partial)': '权益（部分）',
    'Equity Growth': '权益增长率',
    'Equity Growth (Partial)': '权益增长率（部分）',
    'Buildings Acc. Depreciation': '建筑累计折旧',
    'Buildings Market Value': '建筑市值',
    'Ships Acc. Depreciation': '船累计折旧',
    'Ships Market Value': '船市值',
    'LTR: Accounts Receivable': '长期应收：应收账款',
    'LTR: Loans Principal': '长期应收：贷款本金',
    'LTR: Materials Receivable': '长期应收：应收物资',
    'LTR: Materials in Transit': '长期应收：在途物资',
    'Loans Payable: Interest': '应付贷款：利息',
    'Loans Payable: Principal': '应付贷款：本金',
    'Loans Receivable: Interest': '应收贷款：利息',
    'Loans Receivable: Principal': '应收贷款：本金',
    'Long-Term Accounts Payable': '长期应付账款',
    'Long-Term Loans Principal': '长期贷款本金',
    'Long-Term Materials Payable': '长期应付物资',
    'Buildings: Infrastructure': '建筑：基础设施',
    'Buildings: Production': '建筑：生产',
    'Buildings: Resource Extraction': '建筑：资源开采',
    'Deposits: CX': '冻结资金：商品交易所',
    'Deposits: FX': '冻结资金：外汇交易所',
}


def key(term):
    return 'fin.term.' + re.sub(r'[^A-Za-z0-9]+', '_', term).strip('_')


S('XIT FIN —— 会计科目')
for en, zh in TERMS.items():
    E(key(en), en, zh)

# ---------------------------------------------------------------- commands
S('XIT FIN —— 命令')
for f, k, name, zname, desc, zdesc in [
    (X + 'FIN/FIN.ts', 'fin', 'Financial overview', '财务总览',
     'Basic financial overview and inventory breakdown.', '基本财务总览和各地资产明细。'),
    (X + 'FIN/FINPR.ts', 'finpr', 'Profitability Report', '盈利报告',
     'Base profitability report.', '各基地的盈利报告。'),
    (X + 'FINCH/FINCH.ts', 'finch', 'Financial Charts', '财务图表',
     'Financial charts for equity and assets.', '权益和资产的图表。'),
    (X + 'FINBS/FINBS.ts', 'finbs', 'Balance Statement', '资产负债表',
     'Balance statement showing your assets and liabilities.', '显示你的资产和负债的资产负债表。'),
]:
    E(f'{k}.title', name, zname)
    E(f'{k}.description', desc, zdesc)
    R(f, f"name: '{name}',", f"name: t('{k}.title'),")
    R(f, f"description: '{desc}',", f"description: t('{k}.description'),")
E('finch.param', 'Chart Identifier', '图表编号')
R(X + 'FINCH/FINCH.ts', "optionalParameters: 'Chart Identifier',", "optionalParameters: t('finch.param'),")

# ---------------------------------------------------------------- XIT FIN
S('XIT FIN —— 总览')
F = X + 'FIN/FIN.vue'
FIG = [
    ('quickAssets', 'Quick Assets', '速动资产'),
    ('currentAssets', 'Current Assets', '流动资产'),
    ('totalAssets', 'Total Assets', '总资产'),
    ('equity', 'Equity', '权益'),
    ('quickLiabilities', 'Quick Liabilities', '速动负债'),
    ('currentLiabilities', 'Current Liabilities', '流动负债'),
    ('totalLiabilities', 'Total Liabilities', '总负债'),
    ('liquidation', 'Liquidation Value', '清算价值'),
    ('quickRatio', 'Quick Ratio', '速动比率'),
    ('debtRatio', 'Debt Ratio', '负债率'),
]
for k, en, zh in FIG:
    E(f'fin.fig.{k}', en, zh)
TIPS = {
    'quickAssets': (
        'Quick Assets are: Cash and Cash Equivalents, Current Accounts Receivable, and'
        ' Current Loans Receivable (see XIT FINBS for more details). These assets are'
        ' either liquid or close-to-liquid and are used in Quick Ratio calculation.',
        '速动资产包括：现金及现金等价物、短期应收账款、短期应收贷款（详见 XIT FINBS）。'
        '这些资产是现金或接近现金，用于计算速动比率。'),
    'quickLiabilities': (
        'Quick Liabilities are: Current Accounts Payable and Current Loans Payable (see XIT FINBS'
        ' for more details). These liabilities represent immediate financial obligations and are'
        ' used in Quick Ratio calculation.',
        '速动负债包括：短期应付账款和短期应付贷款（详见 XIT FINBS）。'
        '这些是马上要付的钱，用于计算速动比率。'),
    'liquidation': (
        'The market value of all company’s assets that can be converted to cash directly. '
        'The Liquidation Value excludes such assets as ships, HQ upgrades, and ARC, since '
        'they cannot be sold on the market.',
        '公司所有能直接换成现金的资产的市值。船、总部升级和 ARC 不能在市场上卖出，所以不计入清算价值。'),
    'quickRatio': (
        "The quick, or acid-test ratio, compares a company's quick assets to its quick"
        ' liabilities to see if it has enough cash to pay its immediate liabilities,'
        ' such as short-term debt. Generally, a ratio of 1.0 or more indicates a company can pay'
        ' its short-term obligations, while a ratio of less than 1.0 indicates it might struggle'
        ' to pay them.',
        '速动比率（又称酸性测试比率）= 速动资产 ÷ 速动负债，用来看公司有没有足够的现金支付马上到期的负债，'
        '例如短期借款。一般来说，比率不低于 1.0 表示能付清短期债务；低于 1.0 表示可能付不起。'),
    'debtRatio': (
        'The debt ratio is defined as the ratio of total debt to total assets. A debt ratio'
        ' of greater than 100% means a company has more debt than assets while a debt ratio'
        ' of less than 100% indicates that a company has more assets than debt.',
        '负债率 = 总负债 ÷ 总资产。大于 100% 表示负债比资产多；小于 100% 表示资产比负债多。'),
}
for k, (en, zh) in TIPS.items():
    E(f'fin.tip.{k}', en, zh)

old = block(F, 'const figures = computed(() => {', '\n});\n')
new = old
for k, en, _ in FIG:
    new = new.replace(f"name: '{en}',", f"name: t('fin.fig.{k}'),")
# Replace each concatenated tooltip with one key.
for k in TIPS:
    en = TIPS[k][0]
    m = None
    for m in re.finditer(r"tooltip:\s*\n?\s*((?:(?:'[^']*'|\"[^\"]*\")\s*\+?\s*)+),", new):
        parts = re.findall(r"'([^']*)'|\"([^\"]*)\"", m.group(1))
        text = ''.join(a or b for a, b in parts)
        if text == en:
            new = new.replace(m.group(0), f"tooltip: t('fin.tip.{k}'),")
            break
    else:
        raise AssertionError('tooltip not found: ' + k)
R(F, old, new)

E('fin.keyFigures', 'Key Figures', '关键数字')
E('fin.locations', 'Inventory Breakdown', '各地资产')
E('fin.col.name', 'Name', '名称')
E('fin.col.nonCurrent', 'Non-Current Assets', '非流动资产')
E('fin.col.current', 'Current Assets', '流动资产')
E('fin.col.total', 'Total Assets', '总资产')
R(F, '<FinHeader>Key Figures</FinHeader>', "<FinHeader>{{ t('fin.keyFigures') }}</FinHeader>")
R(F, '<FinHeader>Inventory Breakdown</FinHeader>', "<FinHeader>{{ t('fin.locations') }}</FinHeader>")
R(F, '<th>Name</th>', "<th>{{ t('fin.col.name') }}</th>")
R(F, '<th>Non-Current Assets</th>', "<th>{{ t('fin.col.nonCurrent') }}</th>")
R(F, '<th>Current Assets</th>', "<th>{{ t('fin.col.current') }}</th>")
R(F, '<th>Total Assets</th>', "<th>{{ t('fin.col.total') }}</th>")

# ---------------------------------------------------------------- XIT FINPR
S('XIT FINPR —— 盈利报告')
F = X + 'FIN/FINPR.vue'
for k, en, zh in [('cost', 'Daily Cost', '每日成本'), ('repairs', 'Daily Repairs', '每日维修'),
                  ('revenue', 'Daily Revenue', '每日收入'), ('profit', 'Daily Profit', '每日利润'),
                  ('margin', 'Daily Margin', '每日利润率')]:
    E(f'finpr.fig.{k}', en, zh)
    R(F, f"name: '{en}',", f"name: t('finpr.fig.{k}'),")
E('finpr.overview', 'Production Overview', '生产总览')
E('finpr.byPlanet', 'Breakdown by Planet', '各星球明细')
R(F, '<FinHeader>Production Overview</FinHeader>', "<FinHeader>{{ t('finpr.overview') }}</FinHeader>")
R(F, '<FinHeader>Breakdown by Planet</FinHeader>', "<FinHeader>{{ t('finpr.byPlanet') }}</FinHeader>")
for k, en, zh in [('name', 'Name', '名称'), ('cost', 'Cost', '成本'), ('repairs', 'Repairs', '维修'),
                  ('revenue', 'Revenue', '收入'), ('profit', 'Profit', '利润'), ('margin', 'Margin', '利润率')]:
    E(f'finpr.col.{k}', en, zh)
    R(F, f'<th>{en}</th>', f"<th>{{{{ t('finpr.col.{k}') }}}}</th>")

# ---------------------------------------------------------------- XIT FINBS
S('XIT FINBS —— 资产负债表')
F = X + 'FINBS/FINBS.vue'
src = base(F)
for en in sorted(set(re.findall(r"name: '([^']*)',", src))):
    R(F, f"name: '{en}',", f"name: t('{key(en)}'),", src.count(f"name: '{en}',"))
E('finbs.mmTip',
  'Market Maker materials currently stored in CX warehouses. You can customize the list of'
  ' these materials using XIT SET FIN. Since these materials can be converted into cash'
  ' immediately, they are considered Cash Equivalents.',
  '目前存放在交易所仓库里的做市商物资。物资清单可以在 XIT SET FIN 里修改。'
  '这些物资可以马上卖给做市商换成现金，所以算作现金等价物。')
R(F, """          tooltip:
            'Market Maker materials currently stored in CX warehouses. You can customize the list of' +
            ' these materials using XIT SET FIN. Since these materials can be converted into cash' +
            ' immediately, they are considered Cash Equivalents.',""", "          tooltip: t('finbs.mmTip'),")
E('finbs.current', 'Current Period', '本期')
E('finbs.last', 'Last Period', '上期')
E('finbs.previous', 'Previous Period', '前期')
E('finbs.change', 'Change', '变化')
R(F, '<th>Current Period</th>', "<th>{{ t('finbs.current') }}</th>")
R(F, '<template v-else>Last Period</template>', "<template v-else>{{ t('finbs.last') }}</template>")
R(F, '<template v-else>Previous Period</template>', "<template v-else>{{ t('finbs.previous') }}</template>")
R(F, '<th>Change</th>', "<th>{{ t('finbs.change') }}</th>")

E('finbs.total', 'Total', '合计')
R(X + 'FINBS/BalanceSheetSection.vue', '<td :class="C.IncomeStatementPanel.number">Total</td>',
  """<td :class="C.IncomeStatementPanel.number">{{ t('finbs.total') }}</td>""")
F = X + 'FINBS/BalanceSheetRow.vue'
E('finbs.less', 'Less:', '减：')
E('finbs.excluded',
  'This entry is not included in the Equity calculation. To include it, turn on the full equity mode in XIT SET FIN.',
  '这一项没有计入权益。要计入，请在 XIT SET FIN 里打开完整权益模式。')
R(F, '<template v-if="row.less"> Less:</template>', """<template v-if="row.less"> {{ t('finbs.less') }}</template>""")
R(F, '''        tooltip="This entry is not included in the Equity calculation.
         To include it, turn on the full equity mode in XIT SET FIN."''', '''        :tooltip="t('finbs.excluded')"''')

# ---------------------------------------------------------------- XIT FINCH
S('XIT FINCH —— 图表')
F = X + 'FINCH/charts.ts'
src = base(F)
for m in re.finditer(r"label: '(-* ?)([^']*)',", src):
    prefix, en = m.group(1), m.group(2)
    assert en in TERMS, en
    expr = f"'{prefix}' + t('{key(en)}')" if prefix else f"t('{key(en)}')"
    R(F, m.group(0), f"label: {expr},", src.count(m.group(0)))
R(F, "label: userData.fullEquityMode ? 'Equity' : 'Equity (Partial)',",
  f"label: userData.fullEquityMode ? t('{key('Equity')}') : t('{key('Equity (Partial)')}'),")
R(F, "label: userData.fullEquityMode ? 'Equity Growth' : 'Equity Growth (Partial)',",
  f"label: userData.fullEquityMode ? t('{key('Equity Growth')}') : t('{key('Equity Growth (Partial)')}'),")

F = X + 'FINCH/FINCH.vue'
E('finch.assetBreakdown', 'Asset Breakdown', '资产构成')
E('finch.invalid', 'Error: Not a valid chart type', '错误：不是有效的图表类型')
R(F, '<FinHeader>Asset Breakdown</FinHeader>', "<FinHeader>{{ t('finch.assetBreakdown') }}</FinHeader>")
R(F, '<span v-else>Error: Not a valid chart type</span>', "<span v-else>{{ t('finch.invalid') }}</span>")
F = X + 'FINCH/AssetPieChart.vue'
E('finch.current', 'Current', '流动')
E('finch.nonCurrent', 'Non-Current', '非流动')
R(F, """:label-data="['Current', 'Non-Current']\"""", """:label-data="[t('finch.current'), t('finch.nonCurrent')]\"""")
F = X + 'FINCH/HistoryChart.vue'
E('finch.chart', 'Chart', '图表')
E('finch.value', 'Value', '数值')
E('finch.smoothing', 'Smoothing: {0}', '平滑：{0}')
R(F, 'label="Chart"', """:label="t('finch.chart')\"""", 2)
R(F, "return 'Value';", "return t('finch.value');")
R(F, ':label="`Smoothing: ${percent0(averageFactor)}`"', """:label="t('finch.smoothing', percent0(averageFactor))\"""")
F = X + 'FINCH/LineChart.vue'
E('finch.date', 'Date', '日期')
R(F, "text: 'Date',", "text: t('finch.date'),")
