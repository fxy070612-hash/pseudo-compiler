
import json, glob, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
import os
files = sorted(glob.glob('book_out/j*.json'))
refs = {}
for f in files:
    for it in json.load(open(f, encoding='utf-8')):
        refs.setdefault(it['ref'], []).append(os.path.basename(f))
print('文件数', len(files), '唯一题号', len(refs))
d = json.load(open('book_data.json', encoding='utf-8'))
print('book_data 题数', d['stats']['exercises'])
from collections import Counter
print('按章:', json.dumps(dict(sorted(Counter(c['num'] for c in d['chapters'] for _ in c['exercises']).items(), key=lambda kv: int(kv[0]))), ensure_ascii=False))
