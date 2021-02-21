function Drawer(dirs) {
  let seen = new Set;
  let que = []; let steps = new Map;
  function backtrace(m, p_dst) { // finally, we decided to use Dijksta-like backtrace
    if (p_dst == null) return null; // but 我保留了有序的深度扫描便于 debug
    let path = [];
    let p = p_dst, p0k; while (!!(p0k = m.get(p))) {
      let [p0, k] = p0k;
      path.push(k); p = p0;
    }
    return path.reverse();
  }
  let pTarget = null;
  return async () => {
    const a = mat, debug = a.cells.length < 500? console.debug : (p,p1)=>{};
    for (let dir of dirs) switch (dir[0]) { // fill ncol
      case "u": dir[1] = -a.m; break;
      case "d": dir[1] = +a.m; break;
    }
    que.push([pOrigin]); // BFS origin
    seen.clear(); steps.clear(); g.clearRect(0,0,a.m,a.n);
    let ps, p; out:while (!!(ps = que.pop())) while ((p = ps.pop()) != null) {
      seen.add(p); g.fillRect(...a.xy(p), 1, 1); if(dtStep!=0)await delayStep();
      let ps1 = []; que.push(ps1);
      for (let [id, offset] of dirs) {
        let p1 = p+offset;
        if (seen.has(p1) || !hasNeighbor(a, p, p1)) continue;
        steps.set(p1, [p, id]); debug(p, p1);
        if (isTarget(a, p1)) { pTarget = p1; break out; }
        ps1.unshift(p1);
      }
    }
    console.log(steps, backtrace(steps, pTarget));
  };
}
draw = Drawer(dirs);