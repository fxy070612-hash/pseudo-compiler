
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
book = json.load(open('clrs_book.json', encoding='utf-8'))
toc = json.load(open('clrs_toc.json', encoding='utf-8'))
# 复现 _bookbuild.py 的章节元信息构建
import re
order, meta = [], {}
for pt in toc['parts']:
    if pt['title'].strip() in ('Copyright','Preface','Bibliography','Index'): continue
    for ch in pt['chapters']:
        t = ch['title'].strip()
        if t == 'Introduction': continue
        m = re.match(r'^(?:\*\s*)?([A-D](?:\.\d+)?|\d+)\s+(.*)$', t)
        if not m: continue
        num = m.group(1)
        if '-' in num: continue
        order.append(num)
        meta[num] = {'title': m.group(2)}
print('order 前 22:', order[:22])
print('17 in meta?', '17' in meta, '| 18?', '18' in meta, '| 19?', '19' in meta)
print('meta keys:', sorted(meta.keys(), key=lambda x: (len(x), x)))
