# Renju&太空船

本来是打算独立重写两个项目的，但五子连珠棋盘显然很适合作为太空船的打击对象（

## 太空船 [👾](spaceship.html)

它是第一个被重构的，细节不多说，方向键移动空格开炮，其它看 www.websiteasteroids.com

还有按 1 增加一盘， 2 增加彩球、B 键刷新（我在干什么我，为什么要用五子棋盘当靶子…… 🤪 ）

手机触屏估计下个版本支持吧

## 大太空船 [👾👾](spaceship.html?spaceship.js)

它是更激进的重构，预期会支持触摸屏，能重显隐藏的元素（不止能用于打掉广告）

Refactor Notes[0]:
- Use physics-style naming
- Remove unnecessary newlines
- Rename Vector to Vec2
- Remove unused Vector methods, Remove class Line
- Resort Vec2 methods and config HTML tagName s
- Move radians, random(range) to object maths
- L510: Replace toggleBlinkStyle() with DOMTokenList.toggle, Remove unused at L150, and updated.blink.isActive
- Replace updated.blink.time with updated.time.blink
- Replace Logic `time += delta * 1000; if(time>tDelay) {op();time=0;}` with (the same of firedAt)
- Move this.firedAt into updated.time
- Replace (w,h) related double-init with check event-arg in canvasResize
- Extract ALL "ASTEROIDS" const-string prefix
