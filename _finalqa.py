
import json, io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
d = json.load(open('book_data.json', encoding='utf-8'))
probs, refs = [], set()
for ch in d['chapters']:
    for e in ch['exercises']:
        if e['ref'] in refs: probs.append((e['ref'], '重复题号'))
        refs.add(e['ref'])
        if not e.get('statement') or len(e['statement']) < 12: probs.append((e['ref'], '题意过短'))
        if not re.match(r'^[a-z_][a-z0-9_]*$', e.get('entry') or ''): probs.append((e['ref'], 'entry 非法'))
        for k in ('title','statement','inputs','outputs','hint','note'):
            v = str(e.get(k, ''))
            if '\\n' in v or 'undefined' in v or '原文缺失' in v: probs.append((e['ref'], k + ' 有问题'))
        if e.get('kind') not in ('implement','simulate','design','modify','analyze'): probs.append((e['ref'], 'kind 非法'))
print('题数 %d，问题 %d' % (d['stats']['exercises'], len(probs)))
for p in probs[:10]: print('   ', p)
print('章节数', len(d['chapters']), '| 空章', [c['num'] for c in d['chapters'] if not c['exercises']])
# 搜索可用性检查（模拟 UI 的 bookHits 关键字过滤）
def hits(q):
    q = q.lower()
    n = 0
    for ch in d['chapters']:
        for e in ch['exercises']:
            blob = (e['ref'] + ' ' + e['title'] + ' ' + e['statement'] + ' ' + e['hint']).lower()
            if q in blob: n += 1
    return n
for q in ['heapsort','最短路','二分','动态规划','红黑树','dfs','fft']:
    print('搜索 %-8s → %d 题' % (q, hits(q)))
