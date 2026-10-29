"""Translation patch tool.

Specs call S(section), E(key, en, zh), R(file, old, new). Running apply() resets the
touched files to the base branch, applies every replacement (each must match exactly
once unless count is given), adds the `t` import where needed, and regenerates
src/i18n/en.ts and src/i18n/zh.ts.
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.environ.get('I18N_BASE', 'main')  # Official upstream commit (before any translation).

entries = []  # (section, key, en, zh)
reps = {}     # file -> list of (old, new, count)
_section = ['']


def S(name):
    _section[0] = name


def E(key, en, zh):
    assert all(k != key for _, k, _, _ in entries), f'duplicate key {key}'
    entries.append((_section[0], key, en, zh))


def R(file, old, new, count=1):
    reps.setdefault(file, []).append((old, new, count))


def _add_import(path, src):
    if "from '@src/i18n'" in src:
        return src
    names = [n for n in ('t', 'tType', 'tValue', 'tOptions') if re.search(r'\b' + n + r'\(', src)]
    imp = "import { " + ', '.join(names) + " } from '@src/i18n';"
    if path.endswith('.vue'):
        m = re.search(r'<script setup lang="ts">\n', src)
        assert m, f'no script setup in {path}'
        return src[: m.end()] + imp + '\n' + src[m.end():]
    lines = src.split('\n')
    idx = -1
    in_import = False
    for i, line in enumerate(lines):
        if line.startswith('import '):
            in_import = not (line.rstrip().endswith(';'))
            idx = i
        elif in_import:
            idx = i
            if line.rstrip().endswith(';'):
                in_import = False
        elif idx >= 0 and line.strip():
            break
    lines.insert(idx + 1, imp)
    return '\n'.join(lines)


def _ts_str(s):
    return json.dumps(s, ensure_ascii=False).replace("\\'", "'")


def _write_tables():
    out_en = ["// 英文原文。键名按「命令.位置」命名，内容和官方版一致。", 'export default {']
    out_zh = [
        "import type en from './en';",
        '',
        '// 中文译文。键名和 en.ts 一一对应；少写的键会自动显示英文。',
        '// 命令名、物资代码、动作类型等数据不翻译。',
        'const zh: Partial<Record<keyof typeof en, string>> = {',
    ]
    last = None
    for sec, key, en, zh in entries:
        if sec != last:
            out_en.append(f'\n  // {sec}')
            out_zh.append(f'\n  // {sec}')
            last = sec
        out_en.append(f'  {_ts_str(key)}: {_ts_str(en)},')
        if zh is not None:
            out_zh.append(f'  {_ts_str(key)}: {_ts_str(zh)},')
    out_en.append('};\n')
    out_zh.append('};\n\nexport default zh;\n')
    open(f'{ROOT}/src/i18n/en.ts', 'w', encoding='utf-8').write('\n'.join(out_en))
    open(f'{ROOT}/src/i18n/zh.ts', 'w', encoding='utf-8').write('\n'.join(out_zh))


def apply():
    files = sorted(reps)
    subprocess.run(['git', '-C', ROOT, 'checkout', BASE, '--'] + files, check=True)
    errors = []
    for f in files:
        path = f'{ROOT}/{f}'
        src = open(path, encoding='utf-8').read()
        for old, new, count in reps[f]:
            n = src.count(old)
            if (count is None and n == 0) or (count is not None and n != count):
                errors.append(f'{f}: expected {count} got {n}: {old[:80]!r}')
                continue
            src = src.replace(old, new)
        src = _add_import(f, src)
        open(path, 'w', encoding='utf-8').write(src)
    _write_tables()
    used = set()
    for f in files:
        used |= set(re.findall(r"""\bt\(\s*['"]([\w.]+)['"]""", open(f'{ROOT}/{f}', encoding='utf-8').read()))
    keys = {k for _, k, _, _ in entries}
    missing = sorted(used - keys)
    if missing:
        errors.append('keys used but not defined: ' + ', '.join(missing))
    print(f'{len(files)} files, {len(entries)} keys')
    if errors:
        print('ERRORS:\n' + '\n'.join(errors))
        sys.exit(1)
