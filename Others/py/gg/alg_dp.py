amount = 4
items = [("音箱", 3, 4), ("笔电", 2, 3), ("吉他", 1.5, 1)]

def integerify(items, key=1):
  rems = [it[key] % 1 for it in items]
  if all(map(lambda it: it == 0, rems)): return items
  elif all(map(lambda it: it == 0 or it == 0.5, rems)):
    new_list = list([list(it) for it in items])
    for i in range(0, len(new_list)): new_list[i][key] = int(new_list[i][key]*2)
    return new_list
  else: pass # my poor math... 

def solve(amount, items, its_weight=lambda it: it[2]):
  items = sorted(integerify(items), key=its_weight)
  n, m = len(items), max(map(its_weight, items))
  cols = range(1, m+1)
  grid = [[0 for col in cols] for i in range(n)]
  grid[0] = [items[0][1] if items[0][2] <= col else 0 for col in cols] # 第一次只能偷一种商品，所以最优解是固定的
  for i in range(1, n): #商品
    for (j, col) in enumerate(cols): #背包容积 注意
      (name, price, weight) = items[i]
      old_max = grid[i-1][j]
      grid[i][j] = old_max if weight > col else max(old_max, price + grid[i-1][col-weight] if weight != col else price)
  return grid 

print(solve(4,items))
