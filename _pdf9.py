
import re, io, sys, json, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
toc = json.load(open('clrs_toc.json', encoding='utf-8'))
raw = json.load(open('clrs_exercises_raw.json', encoding='utf-8'))

SKIP = {'Copyright','Preface','Bibliography','Index'}
NUMRE = re.compile(r'^(?:\*\s*)?([A-D](?:\.\d+)?|\d+(?:\.\d+)?)\s+(.*)$')

catalog = []
for pt in toc['parts']:
    t = pt['title'].strip()
    if t in SKIP: continue
    chs = []
    for ch in pt['chapters']:
        title = ch['title'].strip()
        if title == 'Introduction': continue
        m = NUMRE.match(title)
        if not m: continue
        secs = []
        for s in ch['sections']:
            sm = NUMRE.match(s['title'].strip())
            if sm:
                secs.append({'num': sm.group(1), 'title': sm.group(2), 'page': s['page']})
        chs.append({'num': m.group(1), 'title': m.group(2), 'page': ch['page'], 'sections': secs})
    pm = NUMRE.match(t)
    catalog.append({'num': pm.group(1) if pm else '', 'title': pm.group(2) if pm else t, 'chapters': chs})

sec2ch = {}
for pt in catalog:
    for ch in pt['chapters']:
        sec2ch[ch['num']] = ch
        for s in ch['sections']:
            sec2ch[s['num']] = ch

def chap_of(num):
    sec = num.rsplit('-', 1)[0]
    if sec in sec2ch: return sec2ch[sec]
    return sec2ch.get(sec.split('.')[0])

merged = []
for it in raw:
    ch = chap_of(it['num'])
    if not ch: continue
    en = it['text']
    merged.append({'ref': it['num'], 'chapter': ch['num'], 'chapterTitle': ch['title'],
                   'section': it['num'].rsplit('-', 1)[0], 'page': it['page'],
                   'en': en if len(en) <= 700 else en[:700] + ' …'})
print('merged', len(merged))
from collections import Counter
c = Counter(m['chapter'] for m in merged)
print('chapters with exercises:', len(c))
print('per chapter:', json.dumps(dict(sorted(c.items(), key=lambda kv: (len(kv[0]), kv[0]))), ensure_ascii=False))
json.dump({'catalog': catalog, 'exercises': merged}, open('clrs_book.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('clrs_book.json bytes', os.path.getsize('clrs_book.json'))
os.makedirs('book_batches', exist_ok=True)
for f in os.listdir('book_batches'): os.remove(os.path.join('book_batches', f))
bysort = {}
for m in merged: bysort.setdefault(m['chapter'], []).append(m)
n = 0
for chap in sorted(bysort, key=lambda x: (len(x), x)):
    lst = bysort[chap]
    for i in range(0, len(lst), 18):
        n += 1
        json.dump({'chapter': chap, 'chapterTitle': lst[0]['chapterTitle'], 'items': lst[i:i+18]},
                  open('book_batches/b%03d.json' % n, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('batches', n)
