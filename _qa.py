
import json, io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
d = json.load(open('book_data.json', encoding='utf-8'))
FIELDS = ['ref','chapter','section','kind','kindCN','title','statement','entry','inputs','outputs','hint','note']
bad = []
for ch in d['chapters']:
    for e in ch['exercises']:
        for f in FIELDS:
            if f not in e: bad.append((e.get('ref'), 'missing ' + f))
        if not e.get('statement') or len(e['statement']) < 12: bad.append((e['ref'], 'statement 过短'))
        if not re.match(r'^[a-z_][a-z0-9_]*$', str(e.get('entry') or '')): bad.append((e['ref'], 'entry 非法: ' + str(e.get('entry'))))
        for f in ('title','statement','inputs','outputs','hint','note'):
            v = str(e.get(f, ''))
            if 'undefined' in v or 'NaN' in v or 'null' in v: bad.append((e['ref'], f + ' 含 undefined/NaN/null'))
            if '原文缺失' in v: bad.append((e['ref'], f + ' 含「原文缺失」'))
print('题数', d['stats']['exercises'], '问题条目', len(bad))
for b in bad[:20]: print('  ', b)
# 反向检查：题库里是否真有这些字段能给 UI 用
print('kind 分布:', json.dumps({k: sum(1 for c in d['chapters'] for e in c['exercises'] if e['kind']==k) for k in ['implement','simulate','design','modify','analyze']}, ensure_ascii=False))
avg = sum(len(e['statement']) for c in d['chapters'] for e in c['exercises']) / d['stats']['exercises']
print('平均题意长度 %.0f 字' % avg)
