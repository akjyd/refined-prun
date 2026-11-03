from tr import S, E, R
G = 'src/features/XIT/GOVBURN/GOVBURN.ts'

S('新功能 —— GOVBURN 维护汇总')
R(G, "import GovBurnOverview from '@src/features/XIT/GOVBURN/GovBurnOverview.vue';",
  "import GovBurnSummary from '@src/features/XIT/GOVBURN/GovBurnSummary.vue';")
R(G, "component: params => (params.length > 0 ? GovBurnPlanetView : GovBurnOverview),",
  "component: params => (params.length > 0 ? GovBurnPlanetView : GovBurnSummary),")

for k, en, zh in [
    ('weekly', 'Weekly', '每周'),
    ('refresh', 'REFRESH', '刷新'),
    ('refreshing', 'REFRESHING…', '刷新中…'),
    ('cost', 'Weekly cost', '每周花费'),
    ('stock', 'Stock', '存量'),
    ('warehouse', 'Warehouse', '仓库'),
    ('restock', 'RESTOCK', '补货'),
    ('nowNext', 'Now → next', '本周 → 下周'),
    ('population', 'Population', '人口'),
    ('happiness', 'Happiness', '真实幸福度'),
    ('needs', 'Needs', '需求满足度'),
    ('noPopulation', 'No population report yet. Open POPR on this planet once.', '还没有人口数据。请在这个星球打开一次 POPR。'),
]:
    E(f'gov.sum.{k}', en, zh)
for k, en, zh in [('PIONEER', 'Pioneers', '先驱者'), ('SETTLER', 'Settlers', '定居者'), ('TECHNICIAN', 'Technicians', '职技工'), ('ENGINEER', 'Engineers', '工程师'), ('SCIENTIST', 'Scientists', '科学家')]:
    E(f'gov.sum.tier.{k}', en, zh)
for k, en, zh in [('SAFETY', 'Safety', '安全'), ('HEALTH', 'Health', '健康'), ('COMFORT', 'Comfort', '舒适'), ('CULTURE', 'Culture', '文化'), ('EDUCATION', 'Education', '教育')]:
    E(f'gov.sum.need.{k}', en, zh)
for k, en, zh in [('SST', 'Safety Station', '安全站'), ('SDP', 'Security Drone Post', '安保无人机岗'), ('EMC', 'Emergency Center', '应急中心'), ('INF', 'Infirmary', '医务室'), ('HOS', 'Hospital', '医院'), ('WCE', 'Wellness Center', '康养中心'), ('PAR', 'Wildlife Park', '野生动物园'), ('4DA', '4D Arcades', '4D 游戏厅'), ('ACA', 'Art Cafe', '艺术咖啡馆'), ('ART', 'Art Gallery', '艺术画廊'), ('VRT', 'VR Theater', 'VR 剧场'), ('PBH', 'Planetary Broadcasting Hub', '行星广播中心'), ('LIB', 'Library', '图书馆'), ('UNI', 'University', '大学')]:
    E(f'gov.sum.bld.{k}', en, zh)
for k, en, zh in [
    ('minutesAgo', 'Updated {0} min ago', '更新于 {0} 分钟前'),
    ('hoursAgo', 'Updated {0} h ago', '更新于 {0} 小时前'),
    ('daysAgo', 'Updated {0} d ago', '更新于 {0} 天前'),
    ('buildings', 'Buildings', '建筑'),
    ('perWeek', '/wk', '/周'),
]:
    E(f'gov.sum.{k}', en, zh)
