# AnimJS 兼容动画系统

别看这个动画像是非常复杂，用了 `doc.elementFromPoint` 碰撞和加速度计算什么的，其实从运动方向的随机性都能看出，只是从初始点不断随机选边角和速度/曲线移过去而已啦。

## EQuery require

```html
<script src="equery/eq.js">$.requireJS("eq._ eq.rect mathjax")</script>
```

## EQuery.ext

`equery.ext` 是启用元编程的特殊对象，赋值 `ext.k=v` 相当于添加名为 `"k"` 的 EQ扩展，若是 `xxxH` 形式则仅对其应用宏展开并复制到 `$.xxx`，否则：

- `v` 的所有 constructor `class` 都会被宏展开并复制到 `$`；如果 `$.ext.enable("global")` 则同时复制到全局对象。
- `v` 所代表的 type ，其 `v[v.k]` 函数 若非 `xxxE` 形式，在 EQ 的链式包装里会作为 `arg1=this` 的拓展方法；如果被 `$.ext.enable($.xxx)` 启用则会在其 type 出现时拓展至原型链。
- 对上条若是 `xxxE` 或 `xxxOnE` 形式，则在 EQ 的链式包装里会作为 `Element` 上的 拓展方法 或 属性。

例如，

- `$.ext.pairH={Pair:class{constructor(first,second){}}` 将定义 `new $.Pair(1,2)=="Pair(1, 2)"`
- `$.ext.array={single:(a,p)=>a.count(p)==1, restsOnE:(e,n)=>[...e.children].slice(n)}` 将定义 `$([1,2]).single(n=> n<10)==false && emet("div hr+a[text=Hello]").rests(1).$.text()=="hello"`

下为类型缩写表：

- `Number` num, int(自动检验参数)
- `String` str, char
- `Array` ary, a1More, a2More
- `Object` any, anyData, anyType
- `Function` fun
