Object.assign(["equery","ext","rect"].reduce((o,k)=>(o[k]=o[k]||{}),this),
(ref=>({
  Point: _.defineOps(class Point {
    plus_(p1){let p=this; p.x+=p1.x,p.y+=p1.y;}
    neg_(){let p=this; p.x=-p.x,p.y=-p.y;}
    minus_(p1){this.plus_(p1.neg())}
    times_(p1){let p=this; p.x*=p1.x,p.y*=p1.y;}
    div_(p1){let p=this; p.x/=p1.x,p.y/=p1.y;}
    cmp(p1)/*[isAtLeft,isUpper]*/{let g=Math.sign; return new Point(g(p.x-p1.x), g(p1.y-p.y))}
  }, "p +-*/~ p1 x y"),
  Rect:ref.Rect,
  Area: class extends ref.Rect {
    constructor(x,y,w,h){
      if(x instanceof Image){this.setXY(0,0); return super(x)}
      this.setXY(x,y);this.setWH(w,h);
    }
    contains(p){}
    randPoint(){}
    *chunked(dx,dy){
      for(let y of range(0,this.h,dy)) for(let x of range(0,this.w,dx)) yield new Area(x,y,dx,dy)
    }
    chunkedN(nx,ny){let m=this; return m.chunked(div(m.w,nx), div(m.h,ny))}
    nineSplit(x,y,xw,yh) {}
    nineSplitOf(kind,pad){}
    fourSplit(ord,x,y,xw,yh){}
    fourSplitOf(kind,pad){}
    clipSpirit(e) {let m=this; r.style.cssText+=`width:${m.w}px;height:${m.h}px;background-position:${m.x}px ${m.y}px;`;}
    static calign(is_horz, boxs, pad=0) {}
    static anchor(kind, box0, box) {} //product("l c r".strs, "t c b".strs)
  },
  posited(r,x,y){}
}) )({
  Rect: class {
    constructor(w,h){if(w instanceof Image)this.setWH(x.naturalWidth,x.naturalHeight);}
    area(){return this.w*this.h}
  }
}))

