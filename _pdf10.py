
import re, io, sys, json, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
pages = open('clrs_pages.txt', encoding='utf-8').read().split(chr(12))
toc = json.load(open('clrs_toc.json', encoding='utf-8'))
starts = []
for pt in toc['parts']:
    for ch in pt['chapters']:
        try: starts.append(int(ch['page']))
        except: pass
        for s in ch['sections']:
            try: starts.append(int(s['page']))
            except: pass
starts = sorted(set(starts))
HEAD = re.compile(r'^\s*(?:\d+(?:\.\d+)?\s+[A-Z][^\n]{0,70}?|\d{1,4}|[A-Z]\.\d+\s+[^\n]{0,60}?)\s*$')
def page_lines(t):
    out = []
    for ln in t.split(chr(10)):
        s = ln.strip()
        if not s or HEAD.match(s): continue
        out.append(s)
    return out
marks = []
for pi, t in enumerate(pages):
    if pi < 24: continue
    if re.search(r'(?m)^Exercises\s*$', t): marks.append(pi)
NUM = r'(\d+\.\d+-\d+)'
items = []
for pi in marks:
    nxt = None
    for sp in starts:
        if sp > pi + 1: nxt = sp; break
    last = min((nxt - 1) if nxt else pi + 6, pi + 6, len(pages) - 1)
    seq = []
    for k in range(pi, last + 1): seq.extend(page_lines(pages[k]))
    start = 0
    for i, ln in enumerate(seq):
        if ln.strip() == 'Exercises': start = i + 1; break
    cut = None
    for i in range(start, len(seq)):
        if re.match(r'^Problems\s*$', seq[i]) or re.match(r'^\d{1,2}\s+[A-Z][a-z]', seq[i]): cut = i; break
    if cut is not None: seq = seq[:cut]
    text = ' '.join(seq)
    parts = re.split(r'(?<![0-9.])' + NUM + r'(?!\d)', text)
    sec = []
    for i in range(1, len(parts), 2):
        sec.append({'num': parts[i], 'text': re.sub(r'\s+', ' ', (parts[i+1] if i+1 < len(parts) else '')).strip()})
    # 主条目：文本不以标点开头；续接片段：以 ) , . ; 等开头 → 接到上一条
    main = []
    for ent in sec:
        t = ent['text']
        if re.match(r'^\s*[)\],;.]', t) and main:
            main[-1]['text'] = (main[-1]['text'] + ' ' + t).strip()
        else:
            main.append({'num': ent['num'], 'text': t})
    for ent in main:
        ent['page'] = pi + 1
    items.extend(main)
print('items after merge', len(items))
from collections import Counter
print('dup refs:', [k for k, v in Counter(i['num'] for i in items).items() if v > 1][:10])
lens = sorted(len(i['text']) for i in items)
print('median %d p90 %d max %d' % (lens[len(lens)//2], lens[int(len(lens)*0.9)], lens[-1]))
json.dump(items, open('clrs_exercises_raw.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for it in items:
    if it['num'] in ('2.1-4','2.2-3','2.2-4','2.3-6','2.3-7','2.3-8','2.2-2','2.3-5'):
        print('---', it['num'], 'len', len(it['text']))
        print('   ', it['text'][:230])
