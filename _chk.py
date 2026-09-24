
import json, glob, os, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
files = sorted(glob.glob('book_out/j*.json'))
print('输出文件数', len(files))
d = json.load(open('book_data.json', encoding='utf-8'))
have = {c['num']: c['count'] for c in d['chapters']}
refs = {}
for f in files:
    for it in json.load(open(f, encoding='utf-8')):
        refs.setdefault(it['ref'], os.path.basename(f))
print('唯一题号', len(refs), '| book_data 题数', d['stats']['exercises'])
miss = {r: f for r, f in refs.items() if r.rsplit('-', 1)[0].split('.')[0] not in have}
print('未入库题号', len(miss))
import collections
print('未入库按章:', collections.Counter(r.split('.')[0] for r in miss))
for r in sorted(miss)[:8]: print('   ', r, '<-', miss[r])
