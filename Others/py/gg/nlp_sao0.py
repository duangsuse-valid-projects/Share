#!/usr/bin/env python3
f = open('sao.txt', 'r')
txt = f.read()
lns = txt.split('\n')
d = {}
for c in txt:
   if c not in d.keys(): d[c] = 0
   d[c] = d[c] + 1
wrds = [(k, d[k]) for k in d.keys()]
swd = sorted(wrds, key=lambda p: p[1], reverse=True)
from pandas import DataFrame
from sys import stdout
dd0 = DataFrame()
dd0['chr'] = [w[0] for w in swd]
dd0['n'] = [w[1] for w in swd]

def color(t, ac): return "\x1b[{}m{}\x1b[0m".format(ac, t)

print(dd0.describe())
print(dd0.head(10))
stdout.write('==\t{}\t=='.format(color('Char Based', 33)))
print(''.join([x[0] for x in swd ]))

import jieba
dd = DataFrame()
dd['line'] = lns
dd['line_len'] = [len(ln) for ln in lns]
dd['words'] = words = [list(jieba.tokenize(l)) for l in lns]
dd['word_len_sum'] = [len(w) for w in words]
dd['word_len_avg'] = [sum(len(c[0]) for c in w) / max(1, len(w)) for w in words]
wr = [ [t[0] for t in ln] for ln in words]

sws = []
for xs in wr:
  for x in xs:
    sws.append(x)

wordc = {}
for (i, w) in enumerate(sws):
  if not w in wordc: wordc[w] = ([i], 0)
  orig = wordc[w]
  orig[0].append(i)
  wordc[w] = (orig[0], orig[1]+1)

count = sorted([(k, wordc[k][1]) for k in wordc], key=lambda t: t[1], reverse=True)

print(dd.describe(), dd.head(10))
print('==\t{}\t=='.format(color('Lexical Based', 33)))
worda = [t[0] for t in count]
print(''.join(worda))

print('==\t{}\t=='.format(color('Autosplit', 34)))
txt_gen = []
from random import sample, randint

wordsp = set('， 、 。 ！ ？ ~ ： ； …'.split(' '))
for lnl in dd['line_len']:
  while lnl != 0:
    txt_gen.append(sample(worda, randint(1,2))[0])
    lnl -= 1
    if (randint(0,1) == 0): txt_gen.append(sample(wordsp, 1)[0])
  if (randint(1,100) < 80): txt_gen.append('\n')

print(''.join(txt_gen))
