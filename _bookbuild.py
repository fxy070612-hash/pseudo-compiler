
# -*- coding: utf-8 -*-
import json, os, io, sys, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BOOK = {'bookTitle': '算法导论（Introduction to Algorithms, 4th ed.）', 'source': 'CLRS 4th edition'}
PART_CN = {'I': '第一部分 基础', 'II': '第二部分 排序与顺序统计', 'III': '第三部分 数据结构',
           'IV': '第四部分 高级设计与分析技术', 'V': '第五部分 高级数据结构',
           'VI': '第六部分 图算法', 'VII': '第七部分 专题选讲', 'VIII': '第八部分 附录：数学基础'}
PART_TITLE_CN = {'I Foundations': '基础', 'II Sorting and Order Statistics': '排序与顺序统计',
                 'III Data Structures': '数据结构', 'IV Advanced Design and Analysis Techniques': '高级设计与分析技术',
                 'V Advanced Data Structures': '高级数据结构', 'VI Graph Algorithms': '图算法',
                 'VII Selected Topics': '专题选讲', 'VIII Appendix: Mathematical Background': '附录：数学基础'}
CH_CN = {'1': '算法在计算中的作用', '2': '入门', '3': '刻画运行时间', '4': '分治', '5': '概率分析与随机化算法',
         '6': '堆排序', '7': '快速排序', '8': '线性时间排序', '9': '中位数与顺序统计',
         '10': '基本数据结构', '11': '散列表', '12': '二叉搜索树', '13': '红黑树',
         '14': '动态规划', '15': '贪心算法', '16': '摊还分析', '17': '增强数据结构',
         '18': 'B 树', '19': '不相交集合的数据结构', '20': '基本的图算法', '21': '最小生成树',
         '22': '单源最短路径', '23': '全对最短路径', '24': '最大流', '25': '二分图中的匹配',
         '26': '并行算法', '27': '在线算法', '28': '矩阵运算', '29': '线性规划',
         '30': '多项式与 FFT', '31': '数论算法', '32': '字符串匹配', '33': '机器学习算法',
         '34': 'NP 完全性', '35': '近似算法'}
KIND_CN = {'implement': '写算法', 'simulate': '模拟过程', 'design': '设计数据结构', 'modify': '改写算法', 'analyze': '分析并实现'}

book = json.load(open('clrs_book.json', encoding='utf-8'))
toc = json.load(open('clrs_toc.json', encoding='utf-8'))

# 章节元信息（按 toc 顺序）
order, meta = [], {}
for pt in toc['parts']:
    if pt['title'].strip() in ('Copyright', 'Preface', 'Bibliography', 'Index'): continue
    for ch in pt['chapters']:
        t = ch['title'].strip()
        if t == 'Introduction': continue
        import re
        m = re.match(r'^(?:\*\s*)?([A-D](?:\.\d+)?|\d+)\s+(.*)$', t)
        if not m: continue
        num = m.group(1)
        if '-' in num: continue
        order.append(num)
        meta[num] = {'part': pt['title'], 'partTitle': PART_TITLE_CN.get(pt['title'], pt['title']),
                     'title': m.group(2), 'titleCN': CH_CN.get(num, ''),
                     'sections': {re.sub(r'^(?:\*\s*)?[\d.A-D]+\s*', '', s['title']).strip(): s['title'] for s in ch['sections']},
                     'page': ch['page']}

trans = {}
for f in sorted(glob.glob('book_out/j*.json')):
    try:
        data = json.load(open(f, encoding='utf-8'))
    except Exception as e:
        print('SKIP bad file', f, e); continue
    if not isinstance(data, list): continue
    for it in data:
        r = it.get('ref')
        if not r or not it.get('statement'): continue
        if r in trans:
            # 同一题号重复：第一条是真实题号，后面的（书里印错/重复）另给后缀
            r2 = r + '\u00b7\u8865'
            n = 2
            while r2 in trans: r2 = r + '\u00b7\u8865' + str(n); n += 1
            it['ref'] = r2
            it['note'] = ((it.get('note') or '') + '\uff08\u4e66\u5185\u8be5\u5904\u9898\u53f7\u5370\u4f5c ' + r + '\uff0c\u5b9e\u4e3a\u76f8\u90bb\u7684\u53e6\u4e00\u9053\u9898\uff09').strip()
            r = r2
        trans[r] = it
print('translated refs:', len(trans))

chapters = []
for num in order:
    items = [trans[r] for r in trans if (trans[r].get('ref') or '').rsplit('-', 1)[0].split('.')[0] == str(num)]
    if not items: continue
    items.sort(key=lambda x: [int(p) if p.isdigit() else 0 for p in x['ref'].replace('-', '.').split('.')])
    out = []
    for it in items:
        out.append({'ref': it['ref'], 'section': it.get('section', ''), 'kind': it.get('kind', 'implement'),
                    'kindCN': KIND_CN.get(it.get('kind', ''), it.get('kind', '')), 'title': it.get('title', ''),
                    'statement': it.get('statement', ''), 'entry': it.get('entry', 'solve'),
                    'inputs': it.get('inputs', ''), 'outputs': it.get('outputs', ''),
                    'hint': it.get('hint', ''), 'note': it.get('note', '')})
    m = meta.get(num, {'partTitle': '', 'title': '', 'titleCN': ''})
    chapters.append({'num': num, 'title': m['title'], 'titleCN': m['titleCN'],
                     'part': m['part'], 'partTitle': m['partTitle'],
                     'count': len(out), 'exercises': out})

data = {'bookTitle': BOOK['bookTitle'], 'source': BOOK['source'], 'chapters': chapters,
        'stats': {'chapters': len(chapters), 'exercises': sum(c['count'] for c in chapters)}}
json.dump(data, open('book_data.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
js = 'window.PseudoBook = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';'
open('book_data.js', 'w', encoding='utf-8').write(js)
print('chapters', len(chapters), 'exercises', data['stats']['exercises'], 'js bytes', len(js))
for c in chapters: print('  第%s章 %s · %s → %d 题' % (c['num'], c['title'], c['titleCN'], c['count']))
