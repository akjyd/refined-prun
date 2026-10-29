import os, re
from tr import S, E, ROOT
from specs.feature_zh import ZH

S('功能开关说明（按功能 ID）')
# English descriptions come from each feature's own registration.
found = {}
for mode in ('basic', 'advanced'):
    for root, _, files in os.walk(os.path.join(ROOT, 'src/features', mode)):
        for f in files:
            if not re.search(r'\.(ts|tsx)$', f) or f.endswith('.test.ts'):
                continue
            src = open(os.path.join(root, f), encoding='utf-8').read()
            m = re.search(r"features\.add\(\s*import\.meta\.url\s*,\s*\w+\s*,\s*((?:'[^']*'|\"[^\"]*\")(?:\s*\+\s*(?:'[^']*'|\"[^\"]*\"))*)", src, re.S)
            if m:
                text = re.sub(r"['\"]\s*\+\s*['\"]", '', m.group(1))[1:-1]
                found[os.path.splitext(f)[0]] = re.sub(r'\s+', ' ', text)
for fid in sorted(found):
    E(f'feature.{fid}', found[fid], ZH.get(fid))
missing = sorted(set(found) - set(ZH))
if missing:
    print('features without Chinese description:', ', '.join(missing))
