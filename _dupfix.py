
import json, glob, io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
# 同一 ref 重复出现时：保留第一条（真实题号），并给后续重复项换一个可区分的 ref
seen = {}
groups = {}
for f in sorted(glob.glob('book_out/j*.json')):
    for it in json.load(open(f, encoding='utf-8')):
        r = it['ref']
        groups.setdefault(r, []).append((f, it))
fix = 0
for r, lst in groups.items():
    if len(lst) < 2: continue
    lst.sort(key=lambda x: x[0])
    head = lst[0][1]
    for f, it in lst[1:]:
        newref = r + '·补'
        it['ref'] = newref
        it['note'] = ((it.get('note') or '') + '（书内该处题号印作 ' + r + '，实为相邻的另一道题）').strip()
        fix += 1
        print('  dup', r, 'in', f, '->', newref, '|', it.get('title'))
print('renamed duplicates:', fix)
