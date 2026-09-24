
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
d = json.load(open('book_data.json', encoding='utf-8'))
def hits(q):
    q = q.lower(); n = 0; chs = 0
    for ch in d['chapters']:
        c = 0
        for e in ch['exercises']:
            blob = (e['ref'] + ' ' + e['title'] + ' ' + e['statement'] + ' ' + e['hint']).lower()
            if q in blob: c += 1
        if c: chs += 1; n += c
    return n, chs
for q in ['最短路','二分','红黑树','矩阵链','背包','拓扑','kmp','fft','插入排序']:
    n, c = hits(q)
    print('搜索 %-6s → %2d 题 / 命中 %d 章' % (q, n, c))
print('空关键字 →', hits('')[0], '题')
