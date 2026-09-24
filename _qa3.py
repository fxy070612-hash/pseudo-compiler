
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
d = json.load(open('book_data.json', encoding='utf-8'))
missing_cn = [c['num'] for c in d['chapters'] if not c.get('titleCN')]
missing_part = [c['num'] for c in d['chapters'] if not c.get('partTitle')]
print('章节数', len(d['chapters']), '| 缺中文章名', missing_cn, '| 缺部分名', missing_part)
parts = []
for c in d['chapters']:
    if c['partTitle'] not in parts: parts.append(c['partTitle'])
print('部分分组(%d):' % len(parts), ' / '.join(parts))
# 抽样检查每章第一题
for c in d['chapters'][:6] + d['chapters'][-3:]:
    e = c['exercises'][0]
    print('  第%s章 %s [%s] %s | %s' % (c['num'], c['titleCN'], e['ref'], e['title'], e['statement'][:60]))
