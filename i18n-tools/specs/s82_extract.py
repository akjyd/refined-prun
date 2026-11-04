from tr import S, E, R

S('新功能 —— XIT EXTRACT 开采')
E('extract.title', 'EXTRACT', '开采')
E('extract.description', 'Daily profit of extraction bases: the best planet for each resource and your watched planets.', '开采基地的日利：每种资源日利最高的星球，以及你关注的星球。')
E('extract.planet', 'Planet', '星球')
E('extract.outputVolume', 'Output / avg daily volume', '日产 / 日均成交')
E('extract.profitJumps', 'Daily profit · jumps', '日利 · 跳数')
E('extract.loading', 'Loading planet data...', '正在读取星球数据...')
E('extract.jumps', '{0} j', '{0} 跳')
for k, en, zh in [
    ('RESOURCE_EXTRACTION', 'Resource extraction', '资源开采'),
    ('METALLURGY', 'Metallurgy', '冶金'),
    ('CHEMISTRY', 'Chemistry', '化工'),
    ('AGRICULTURE', 'Agriculture', '农业'),
    ('CONSTRUCTION', 'Construction', '建筑'),
    ('MANUFACTURING', 'Manufacturing', '制造'),
    ('ELECTRONICS', 'Electronics', '电子'),
    ('FOOD_INDUSTRIES', 'Food industries', '食品'),
    ('FUEL_REFINING', 'Fuel refining', '燃料'),
    ('WORKFORCE_PIONEERS', 'Pioneers', '先驱者'),
    ('WORKFORCE_SETTLERS', 'Settlers', '定居者'),
    ('WORKFORCE_TECHNICIANS', 'Technicians', '技术员'),
    ('WORKFORCE_ENGINEERS', 'Engineers', '工程师'),
    ('WORKFORCE_SCIENTISTS', 'Scientists', '科学家'),
]:
    E(f'extract.cogc.{k}', en, zh)
