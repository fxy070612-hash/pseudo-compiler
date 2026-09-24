
import re, io, sys, json, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
book = json.load(open('clrs_book.json', encoding='utf-8'))
ex = book['exercises']

CODE = ['pseudocode','pseudo-code','write a procedure','give an algorithm','give a procedure','design an algorithm',
        'write an algorithm','implement','give pseudocode','write pseudocode','show how to','describe an algorithm',
        'give an efficient algorithm','write a program','modify','rewrite','adapt','extend the','algorithm to',
        'data structure that supports','draw the','illustrate the operation','simulate','run the','show the result',
        'compute','find an','find the','return the','output','input','array','sort','search','list','tree','heap',
        'graph','path','matrix','sequence','queue','stack','hash','insert','delete','build','construct','convert']
NONCODE = ['prove','proof','show that','argue that','explain why','why does','why do','why is','why are','discuss',
           'compare and contrast','state whether','is it true','true or false','what is the','what are','how many',
           'give an example','provide an example','counterexample','justify','derive','demonstrate that','verify that',
           'theorem','lemma','corollary','asymptotic','big-oh','theta','omega','o-notation','express','bound',
           'definition of','formal definition','illustrate the meaning','which of the following','rank the',
           'suppose that','describe the','characterize','argue','explain how the','can you','do you','what does']

def classify(it):
    t = it['en'].lower()
    score = 0
    for k in CODE:
        if k in t: score += 1
    for k in NONCODE:
        if k in t: score -= 1
    if re.search(r'\b(write|give|design|implement|modify|rewrite|show how|create|develop)\b', t): score += 2
    if re.search(r'\b(pseudocode|procedure|algorithm)\b', t): score += 2
    if 'prove' in t or 'proof' in t: score -= 2
    if len(it['en']) < 60: score -= 2
    return score

scored = [(classify(it), it) for it in ex]
keep = [it for s, it in scored if s >= 1]
drop = [it for s, it in scored if s < 1]
print('keep(疑似要写算法)', len(keep), ' drop', len(drop))
from collections import Counter
print('keep per chapter:', json.dumps(dict(sorted(Counter(k['chapter'] for k in keep).items(), key=lambda kv: (len(kv[0]), kv[0]))), ensure_ascii=False))
json.dump(keep, open('clrs_alg_candidates.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
import random
random.seed(11)
print('=== dropped samples ===')
for it in random.sample(drop, min(12, len(drop))): print(' -', it['ref'], it['en'][:110])
print('=== kept samples ===')
for it in random.sample(keep, min(12, len(keep))): print(' +', it['ref'], it['en'][:110])
