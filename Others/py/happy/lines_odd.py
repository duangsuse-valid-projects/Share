from sys import stdin
fmt=">%s"
def mapMod2(n, xs, op): return ((op(x) if i%2==n else x) for i,x in enumerate(xs))
print("\n".join(mapMod2(0, stdin, lambda ln: fmt%ln[:-1])))

