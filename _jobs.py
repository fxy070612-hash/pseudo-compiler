
import json, os, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
cand = json.load(open('clrs_alg_candidates.json', encoding='utf-8'))
book = json.load(open('clrs_book.json', encoding='utf-8'))
cat = {c['num']: c for pt in book['catalog'] for c in pt['chapters']}
os.makedirs('alg_jobs', exist_ok=True)
for f in os.listdir('alg_jobs'): os.remove(os.path.join('alg_jobs', f))
bysort = {}
for m in cand: bysort.setdefault(m['chapter'], []).append(m)
n = 0
plan = []
for chap in sorted(bysort, key=lambda x: (len(x), x)):
    lst = bysort[chap]
    for i in range(0, len(lst), 16):
        n += 1
        chunk = lst[i:i+16]
        job = {'job': 'j%03d' % n, 'chapter': chap, 'chapterTitle': chunk[0]['chapterTitle'], 'items': chunk}
        json.dump(job, open('alg_jobs/j%03d.json' % n, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        plan.append((job['job'], chap, chunk[0]['chapterTitle'], len(chunk)))
print('jobs', n, 'items', sum(p[3] for p in plan))
for p in plan[:8]: print(p)
json.dump([{'job': p[0], 'chapter': p[1], 'title': p[2], 'n': p[3]} for p in plan], open('alg_plan.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
