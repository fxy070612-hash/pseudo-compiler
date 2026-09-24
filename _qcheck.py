
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
book = json.load(open('book_data.json', encoding='utf-8'))
print('章节', len(book['chapters']), '题', book['stats']['exercises'])
# 起步模板生成（与 ui.js 的 bookStarter 同规则）
def starter(it):
    fn = ''.join(ch if (ch.isalnum() or ch == '_') else '_' for ch in (it.get('entry') or 'solve')).lower()
    ins = it.get('inputs') or ''
    params = []
    import re
    for m in re.findall(r'[A-Za-z][A-Za-z0-9]*\s*\[1\.\.n\]', ins):
        nm = m.split('[')[0].strip()
        if nm not in params: params.append(nm + '[1..n]')
    if not params: params.append('n')
    lines = ['// ' + it['ref'] + ' ' + it['title'], 'function ' + fn + '(' + ', '.join(params) + ')', '  ans = 0', '  // TODO', '  return ans', 'end']
    return lines
samples = []
for ch in book['chapters']:
    for e in ch['exercises'][:2]: samples.append(e)
print('=== 抽样（含起步模板第一行） ===')
for e in samples[:8]:
    print('--', e['ref'], '|', e['kindCN'], '|', e['title'])
    print('   输入：', e['inputs'])
    print('   输出：', e['outputs'])
    print('   模板：', ' / '.join(starter(e)[:2]))
    print('   题意：', e['statement'][:150])
