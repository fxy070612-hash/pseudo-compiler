
import json, glob, io, sys, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
d = json.load(open('book_data.json', encoding='utf-8'))
have = set(c['num'] for c in d['chapters'])
print('book_data 章节:', sorted(have, key=lambda x: int(x)))
refs = {}
for f in sorted(glob.glob('book_out/j*.json')):
    for it in json.load(open(f, encoding='utf-8')):
        refs.setdefault(it['ref'], os.path.basename(f))
miss = {r: f for r, f in refs.items() if r.rsplit('-', 1)[0].split('.')[0] not in have}
print('未合入的题号数:', len(miss))
for r, f in sorted(miss.items())[:20]:
    print('   ', r, '<-', f)
