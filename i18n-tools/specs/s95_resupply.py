from tr import S, E, R

S('XIT RESUP：一键补给与装货')

# XIT RESUP: one click on a docked ship. 2026-11-07.
E('resup.title', 'Resupply', '补给')
E('resup.description',
  'Puts the supplies a docked ship carries into the base and loads the goods the base has made.',
  '把停泊的船上的补给卸到基地，再把基地做出来的产物装上船。')
E('resup.parameters', 'Ship registration', '船舶注册号')
E('resup.noShip', 'No ship {0}.', '找不到船 {0}。')
E('resup.noBase', 'The ship is not at a base of yours.', '这条船不在你的基地。')
E('resup.toBase', 'To the base', '卸到基地')
E('resup.toWarehouse', 'To the warehouse', '卸到仓库')
E('resup.toShip', 'To the ship', '装上船')
E('resup.nothing', 'Nothing to move.', '没有要搬的东西。')
E('resup.baseFull',
  'The base and the warehouse are full, so a part of the supplies stays on the ship.',
  '基地和仓库都满了，有一部分补给留在船上。')
E('resup.shipFull', 'The ship is full, so a part of the goods stays here.',
  '船装满了，有一部分产物留在基地。')
E('set.burn.intermediate', 'Intermediate days', '中间产物留存天数')
E('set.burn.intermediateHint',
  'Days of a material the planet both makes and uses that stay there when a ship loads the '
  'goods.',
  '既是产物又被本星球消耗的物资，装船时在星球上留几天的量。')
E('set.burn.shipDays', 'Ship resupply days', '补给天数')
E('set.burn.shipDaysHint',
  'Days of supply a ship leaves on a planet. Empty means every supply the ship holds goes down.',
  '船在这个星球卸下多少天的补给。留空表示船上的补给全部卸下。')
E('set.burn.infinite', 'all', '无限')
E('set.burn.title', 'BURN', '基地补给')
E('set.burn.groupShip', 'Ship resupply', '一键补给')
E('set.burn.groupGroups', 'Planet groups', '星球分组')

F = 'src/features/XIT/SET/SET.vue'
R(F, "import ARB from '@src/features/XIT/SET/ARB.vue';",
   "import ARB from '@src/features/XIT/SET/ARB.vue';\n"
   "import BURN from '@src/features/XIT/SET/BURN.vue';")
R(F, """  {
    id: 'ARB',
    label: t('set.arb.title'),
    component: ARB,
  },""",
  """  {
    id: 'ARB',
    label: t('set.arb.title'),
    component: ARB,
  },
  {
    id: 'BURN',
    label: t('set.burn.title'),
    component: BURN,
  },""")
