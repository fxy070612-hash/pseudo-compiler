
import json, os, io, sys, re, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
book = json.load(open('clrs_book.json', encoding='utf-8'))
chmeta = {}
for pt in book['catalog']:
    for ch in pt['chapters']:
        chmeta[ch['num']] = {'part': pt['num'], 'partTitle': pt['title'], 'title': ch['title'],
                             'sections': {s['num']: s['title'] for s in ch['sections']}, 'page': ch['page']}
files = sorted(glob.glob('book_out/j*.json'))
print('translated files:', len(files))
items = []
bad = []
for f in files:
    try:
        data = json.load(open(f, encoding='utf-8'))
    except Exception as e:
        bad.append((f, str(e))); continue
    if not isinstance(data, list): bad.append((f, 'not a list')); continue
    for it in data:
        if not it.get('ref') or not it.get('statement'): bad.append((f, 'missing ref/statement: ' + str(it.get('ref')))); continue
        items.append(it)
print('items', len(items), 'bad', len(bad))
for b in bad[:6]: print('  BAD', b)
# dedupe by ref keeping the longest statement
best = {}
for it in items:
    r = it['ref']
    if r not in best or len(it.get('statement','')) > len(best[r].get('statement','')): best[r] = it
items = list(best.values())
print('unique', len(items))
from collections import Counter
print('kind:', json.dumps(dict(Counter(i.get('kind','?') for i in items)), ensure_ascii=False))
print('chapters:', json.dumps(dict(sorted(Counter(i['chapter'] for i in items).items(), key=lambda kv: (len(kv[0]), kv[0]))), ensure_ascii=False))
json.dump(items, open('clrs_alg_final.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
print('saved clrs_alg_final.json')
