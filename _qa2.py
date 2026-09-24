
import json, io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
d = json.load(open('book_data.json', encoding='utf-8'))
bad = []
sizes = []
for ch in d['chapters']:
    for e in ch['exercises']:
        sizes.append(len(e['statement']))
        if not e.get('statement'): bad.append((e['ref'], '空题意'))
        if e.get('kind') not in ('implement','simulate','design','modify','analyze'): bad.append((e['ref'], 'kind'))
print('题数', d['stats']['exercises'], '| 章节', len(d['chapters']))
print('题意长度：平均 %.0f 字，最短 %d，最长 %d' % (sum(sizes)/len(sizes), min(sizes), max(sizes)))
print('问题', len(bad))
import collections
print('kind 分布:', json.dumps(dict(collections.Counter(e['kind'] for c in d['chapters'] for e in c['exercises'])), ensure_ascii=False))
print('每题字段集:', 'OK' if all(set(e) == {'ref','section','kind','kindCN','title','statement','entry','inputs','outputs','hint','note'} for c in d['chapters'] for e in c['exercises']) else '不一致')
