
import json, glob, os, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
d = json.load(open('book_data.json', encoding='utf-8'))
have = {c['num']: c['count'] for c in d['chapters']}
plan = json.load(open('alg_plan.json', encoding='utf-8'))
done = set(os.path.basename(f)[:-5] for f in glob.glob('book_out/j*.json'))
bych = {}
for o in plan:
    bych.setdefault(o['chapter'], {'total': 0, 'done': 0, 'left': []})
    bych[o['chapter']]['total'] += o['n']
    if o['job'] in done: bych[o['chapter']]['done'] += o['n']
    else: bych[o['chapter']]['left'].append(o['job'])
done_ch = [k for k in sorted(bych, key=lambda x: int(x)) if not bych[k]['left']]
left_ch = [k for k in sorted(bych, key=lambda x: int(x)) if bych[k]['left']]
print('入库章节 %d，总题 %d' % (len(have), d['stats']['exercises']))
print('已完成加工的章:', ' '.join(done_ch))
print('仍有未完成批次的章:', ' '.join('%s(%s)' % (k, ','.join(bych[k]['left'])) for k in left_ch))
print('计划总量 %d 题，剩余 %d 题' % (sum(v['total'] for v in bych.values()), sum(v['total'] - v['done'] for v in bych.values())))
