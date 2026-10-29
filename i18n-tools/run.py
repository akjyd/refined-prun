import importlib, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import tr
for f in sorted(os.listdir(os.path.join(os.path.dirname(__file__), 'specs'))):
    if f.endswith('.py'):
        importlib.import_module('specs.' + f[:-3])
tr.apply()
import subprocess
files = sorted(tr.reps) + ['src/i18n/en.ts', 'src/i18n/zh.ts', 'src/i18n/index.ts']
subprocess.run(['npx', '-y', 'pnpm@11.15.0', 'exec', 'prettier', '--write', '--log-level', 'warn'] + files, cwd=tr.ROOT, check=True)
