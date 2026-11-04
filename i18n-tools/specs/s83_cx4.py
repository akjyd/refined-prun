from tr import S, E, R

S('新功能 —— XIT CX4 四市场订单簿')
E('cx4.title', 'CX4', '四市场订单簿')
E('cx4.description', 'Switches four CXOB windows (AI1, CI1, IC1, NC1) to one material at once.', '把四个 CXOB 窗口（AI1、CI1、IC1、NC1）一起切换到同一种物资。')
E('cx4.all', 'All', '全部')
E('cx4.favorites', 'Favorites', '收藏')
E('cx4.recent', 'Recent', '最近查看')
E('cx4.note', 'Click a material to show its order books on the four exchanges. Right-click a material to add it to or remove it from favorites.', '点物资，右边显示它在四个市场的订单簿。右键物资加入或移出收藏。')
E('cx4.loading', 'Waiting for order book data...', '正在等待订单簿数据...')
E('cx4.amount', 'Amount', '数量')
E('cx4.price', 'Price', '价格')
E('cx4.spread', 'Spread {0}', '价差 {0}')
for k, en, zh in [
    ('agriculturalproducts', 'Agricultural products', '农产品'),
    ('alloys', 'Alloys', '合金'),
    ('chemicals', 'Chemicals', '化学品'),
    ('constructionmaterials', 'Construction materials', '建筑材料'),
    ('constructionparts', 'Construction parts', '建筑部件'),
    ('constructionprefabs', 'Construction prefabs', '建筑预制件'),
    ('consumablebundles', 'Consumable bundles', '消耗品套装'),
    ('consumablesbasic', 'Consumables (basic)', '基本消耗品'),
    ('consumablesluxury', 'Consumables (luxury)', '奢侈消耗品'),
    ('drones', 'Drones', '无人机'),
    ('electronicdevices', 'Electronic devices', '电子设备'),
    ('electronicparts', 'Electronic parts', '电子零件'),
    ('electronicpieces', 'Electronic pieces', '电子元件'),
    ('electronicsystems', 'Electronic systems', '电子系统'),
    ('elements', 'Elements', '元素'),
    ('energysystems', 'Energy systems', '能源系统'),
    ('fuels', 'Fuels', '燃料'),
    ('gases', 'Gases', '气体'),
    ('infrastructure', 'Infrastructure', '基础设施'),
    ('liquids', 'Liquids', '液体'),
    ('medicalequipment', 'Medical equipment', '医疗设备'),
    ('metals', 'Metals', '金属'),
    ('minerals', 'Minerals', '矿物'),
    ('ores', 'Ores', '矿石'),
    ('plastics', 'Plastics', '塑料'),
    ('shipengines', 'Ship engines', '舰船引擎'),
    ('shipkits', 'Ship kits', '舰船套件'),
    ('shipparts', 'Ship parts', '舰船部件'),
    ('shipshields', 'Ship shields', '舰船护盾'),
    ('softwarecomponents', 'Software components', '软件组件'),
    ('softwaresystems', 'Software systems', '软件系统'),
    ('softwaretools', 'Software tools', '软件工具'),
    ('textiles', 'Textiles', '纺织品'),
    ('unitprefabs', 'Unit prefabs', '单元预制件'),
    ('utility', 'Utility', '通用物资'),
]:
    E(f'cx4.cat.{k}', en, zh)
