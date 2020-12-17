parenCps = { 0: ['(', 1], 1: [')', 0-1] }
from strops import trimBetween
if __name__ == "__main__": print(trimBetween(parenCps, "hello( no) hawaii"))
