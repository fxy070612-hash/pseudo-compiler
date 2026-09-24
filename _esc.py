
import json, glob, io, sys, os, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
bad = []
for f in sorted(glob.glob('book_out/j*.json')):
    try: data = json.load(open(f, encoding='utf-8'))
    except Exception as e: bad.append((f, 'JSON 解析失败 ' + str(e))); continue
    for it in data:
        for k in ('statement','title','inputs','outputs','hint','note'):
            v = str(it.get(k, ''))
            if '\\n' in v: bad.append((os.path.basename(f), it.get('ref'), k, '含字面 \\n'))
            if '\\t' in v: bad.append((os.path.basename(f), it.get('ref'), k, '含字面 \\t'))
            if '  ' in v and k == 'statement': pass
print('字面转义问题:', len(bad))
for b in bad[:15]: print('   ', b)
