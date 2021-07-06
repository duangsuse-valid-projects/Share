
很久没写过编程入门教程了，本苏觉得这种归纳还是很有意义的，什么东西学会了再去撰写提纲，总会发现些之前没有的点、找不到的灵感，咱一直觉得最厉害的大佬，所用的招式却会和「基础」脱不开关系；这次暑假会为一个同学重新写一个《小白的 Ruby 红宝书》

```js
for(let i=0; i<n;i) op();
```

抽离出

```js
let res=[];
for(let x of xs)res.push(op(x));
```

map

```js
let res=[];
for(let x of xs)if(p(x)) res.push(x);
```

filter

然后还有仅修改列表的部分项（如偶数的）的算法，可以用 `a.map((x,i)=>isOdd(i)? x:op(x) )`

复制与改变

就是说 o.wtf 会发生变化，这实际也是指调用 getK.wtf(o) 的结果，以及各种全局变量和 `console.log` 类 API 的 I/O 会最终变化

程序的运行，一个变量可能带来庞大的因果链，限制可变性有利于改进性能，但现阶段不能过度依赖执行环境的优化，合理利用、复制 [] {} 等可变对象也会让编程轻松很多。

```js
mix(
  ingred("cream", (20).g),
  bake("cookie", (6).min),
  bake("cake", (20).min )
)
```
