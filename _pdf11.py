
import re, io, sys, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
ex = json.load(open('clrs_exercises_raw.json', encoding='utf-8'))
# merge duplicate refs: keep the longest, and trim a preceding item at the tail occurrence of that ref
byref = {}
order = []
for it in ex:
    r = it['num']
    if r not in byref:
        byref[r] = it; order.append(r); continue
    prev = byref[r]
    if len(it['text']) > len(prev['text']):
        byref[r] = it
    # 前一条尾巴里若是下一次出现该题号，切掉
    pat = re.compile(r'(?<![0-9.])' + re.escape(r) + r'(?!\d)')
    ms = list(pat.finditer(prev['text']))
    if ms and ms[-1].start() > 0:
        prev['text'] = prev['text'][:ms[-1].start()].strip()
out = [byref[r] for r in order]
print('unique items', len(out))
lens = sorted(len(i['text']) for i in out)
print('median %d p90 %d max %d,  empty=%d' % (lens[len(lens)//2], lens[int(len(lens)*0.9)], lens[-1], sum(1 for i in out if len(i['text'])<20)))
json.dump(out, open('clrs_exercises_raw.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for it in out:
    if it['num'].startswith('3.'): print('---', it['num'], len(it['text']), '|', it['text'][:150])
