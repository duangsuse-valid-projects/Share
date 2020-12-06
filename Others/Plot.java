// 2D axis plot with AWT/Swing's JPanel/JFrame
import java.awt.*; //Graphics,Dimension,...
import javax.swing.JFrame;
import javax.swing.JPanel;

import java.util.List;
import java.util.LinkedList;
import java.util.ArrayList;
import java.util.Iterator;

// FAILED: Maybe API unfamiler-ness? Go and have a lunch...

final class PlotJava {
  static class PlotPanel extends JPanel { // TODO: Generalize out type <Integer>
    int w, h, pad=20;
    public boolean hasGrid;
    public String title, labelX, labelY;
    public LinkedList<List<Integer>> series = new LinkedList<>();
    public PlotPanel(int w, int h) { this.w=w; this.h=h; setPreferredSize(new Dimension(w, h)); }
    public @Override void paint(Graphics g) {
      for (List<Integer> serie : series) { paintLineOn(g, serie); } // TODO: bounds should be solved using minMax(flatMap(minMax, series))
    }
    private void paintLineOn(Graphics g, List<Integer> ints) {
      IntPair bounds = minMax(ints);
      double hInts = bounds.second - bounds.first;
      Dimension box = getSize();
      double fh = (double)box.height-pad, fw = (double)box.width-pad;
      Iterator<Integer> iz = ints.iterator();
      int i0 = iz.next();
      if (hInts == 0) { g.drawLine(0, (int) (hInts/i0*fh), w, (int) (hInts/i0*fh)); return; }
      int x = 0; int dX = (int) (fw/ints.size());
      while (iz.hasNext()) { int i1 = iz.next();
        g.drawLine(x, (int) (fh*(hInts/i0)), x+dX, (int) (fh*(hInts/i1)));
        x += dX; i0 = i1;
        System.out.println(x+" "+" "+i0+","+i1);
      } //^ could not use iz.forEachRemaining due to effective final (mutate closure upvalue).
    }
  }
  static class IntPair { public int first, second; public IntPair(int a, int b) { first=a; second=b; } }
  static IntPair minMax(Iterable<Integer> ints) {
    Iterator<Integer> intz = ints.iterator();
    int fst = intz.next();
    int min=fst; int max=fst; // 开始写的 min=Int.MAX_VALUE, max=Int.MIN_VALUE ，后来发现单调递增之类就不行，果然还是得这样
    while (intz.hasNext()) { int n = intz.next(); if (n > max) max = n; else if (n < min) min = n; }
    return new IntPair(min, max);
  }
  static public void main(String... args) {
    JFrame win = new JFrame("Simple plot");
    win.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
    PlotPanel plot = new PlotPanel(300, 256);
    plot.series.add(aListMap(1, 100, (x) -> x%2==0? 1 : x));
    plot.series.add(aListMap(1, 2, (x) -> x));
    win.setContentPane(plot); win.pack(); win.setVisible(true);
  }
  @FunctionalInterface interface GraphFunc { int map(int x); }
  static ArrayList<Integer> aListMap(int start, int stop, GraphFunc f) {
    ArrayList<Integer> ys = new ArrayList<>(stop - start);
    for (int i=start; i<stop; i++) { ys.add(f.map(i)); }
    return ys;
  }
}
