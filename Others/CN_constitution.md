# 中华人民共和国宪法

> 这是一个 Literate ，请用 `python fill_template.py CN_constitution.md` 获得真实文本。

本项目为政治无关实验性项目；宪法版本如其文本示，为 2018 版。

```python
# !!execute
digits = list("零一二三四五六七八九")
units = { "十": 10, "百": 100 } # 增添以扩充定义域

def revDict(d): return dict(map(reversed, d.items()))
def makeMaxLE(d):
  dsc = sorted(d.items(), reverse=True)
  def maxLE(n):
    for (k, v) in dsc:
      if k <= n: return (k, v)
  return maxLE

def showHanTo(sb, n, maxLE): # 定义域：正整数|零
  global digits
  unit = maxLE(n) # 左右各递归解构。
  if unit == None: sb.append(digits[n]); return 1 # 不大十
  (u, name) = unit
  (nDigi, nNext) = divmod(n, u)
  showHanTo(sb, nDigi, maxLE)
  sb.append(name)
  if nNext != 0:
    iZero = len(sb)
    u1 = showHanTo(sb, nNext, maxLE) # 二十【零】
    if (u / u1) > 10: sb.insert(iZero, "零")
  return u

unitsMaxLE =  makeMaxLE(revDict(units))
def showHan(sn):
  global showHanTo, unitsMaxLE
  sb = []
  showHanTo(sb, int(sn), unitsMaxLE)
  return "".join(sb)
scope["han"] = showHan
scope["hanDigits"] = digits
```

脚本是为方便中文编号输出的，使用的是 `maxLessThanOrEquals`+右递归小单位 算法，在此处不作赘述。

除了这个脚本，还有一些方便的宏必须定义：

```python
# !!define
条例自_PY2(sn, *rules) "\n".join(map(lambda i: "* 第"+scope["han"](int(sn)+i)+"条"+rules[i], range(0, len(rules))))
年月日(y,m,d) {y.rjust(4, '0')}年{m}月{d}日
人大次第(n) 第{scope['han'](n)}届全国人民代表大会
会通次第(n) 第{scope['han'](n)}次会议通过
```

```
// test.txt
#han(123)
#条例自(1,
你好,
世界,
再见)
#年月日(1989, 8, 2)
#人大次第(1)
#会通次第(2)
```
