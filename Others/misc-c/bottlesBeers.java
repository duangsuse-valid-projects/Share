class BottlesOfBeers {

static private int bb1Rec(int nBeer, int nBottle, int nCap) { return (nCap>=cs[1])? bb1Rec(nBeer+nCap/cs[1], nBottle+(nCap/cs[1]), nCap%cs[1]) : (nBottle>=cs[0])? bb1Rec(nBeer+nBottle/cs[0], nBottle%cs[0], nCap+(nBottle/cs[0])) : nBeer; }
static public int bottleBeer1(int n) { return bb1Rec(n, n, n)+n; }
static public int bottleBeer2(int n, int nBeer, int nBottle, int nCap) {
  int n0 = nBeer+nBottle; int n1 = nBeer+nCap;
  return (n1>=cs[1])? bottleBeer2(n+nBeer, n1/cs[1], n0, n1%cs[1]) :
    (n0>=cs[0])? bottleBeer2(n+nBeer, n0/cs[0], n0%cs[0], n1) : n+nBeer;
}

static public int[] cs = {2, 4};   
static public void main(String... args) {
  int n = 10/2;
  System.out.println(bottleBeer1(n));
  System.out.println(bottleBeer2(0, n, 0, 0));
}
}
