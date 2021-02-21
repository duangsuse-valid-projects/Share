function Drawer(dirs) {
  let seen = new Set;
  let que = [];
  return async () => {
    const a = mat;
    prepareMatDraw();
    seen.clear();
    que.push(pOrigin); // BFS origin
    out:while ((p = que.pop()) !== undefined) {
      seen.add(p); let [x,y]=a.xy(p); g.fillRect(x, y, 1, 1);
      for (let dir of dirs) {
        let p1 = p+dir[1];
        if (seen.has(p1) || !hasNeighbor(a, p, p1)) continue;
        if (isTarget(a, p1)) break out;
        que.push(p1);
      }
      if(dtStep!=0)await delayStep();
    }
  };
}
draw = Drawer(dirs);