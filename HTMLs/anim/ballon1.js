/*
 * Balloon.js
 * Multi-color balloons expanding and flying up from the bottom of your screen.
 * Created by Shuqiao Zhang in 2018, edited by duangsuse in 2021.
 * https://zhangshuqiao.org
 * Licence: GPLv3
 */

(function() {
	const data = `<?xml version="1.0" encoding="UTF-8"?>
<svg class="ballon" enable-background="new 0 0 166 577" viewBox="0 0 166 577" xmlns="http://www.w3.org/2000/svg">
<path class="st0" d="m163.1 117c3.4-13.3 4-27 1.6-41-1.8-10.5-5.1-20.4-9.8-29.5-1.4-2.7-2.9-5.4-4.6-8-7.5-11.7-16.7-20.9-27.8-27.6-11.8-7.1-24.6-10.8-38.4-10.9-13.1-0.1-25.6 3.2-37.5 9.9-11.4 6.5-21.1 15.4-29 26.6-2.3 3.2-4.3 6.5-6.1 9.9-0.6 1-1.1 2-1.6 3-0.2 0.3-0.3 0.7-0.5 1-3.6 7.6-6.2 15.5-7.8 23.8-2.7 14.5-2.1 28.7 1.9 42.8 4.1 14.3 10 28.6 18 42.7 3.4 6 7.1 12 11.2 17.9 10.6 15.6 23.9 31.4 39.8 47.3 2.3 2.3 4.7 4.6 7.1 6.9l-8 8.1h22l-7-8.2c20.4-20.6 36.5-39.4 48.4-56.5 13.9-20 23.2-39.4 28.1-58.2z"/>
<path class="st1" d="m81.1 237.7c-4 11.3-7.1 21.6-9.4 30.8-4.5 18.3-6.9 36.3-7.2 54-0.2 17.7 1.6 34.5 5.4 50.4 1.6 6.7 4 14.5 7.2 23.5 1.7 4.9 3.7 10.1 5.9 15.7 6.8 17.2 11.2 29.8 13.4 37.6 4.2 14.9 6.4 30.1 6.7 45.6 0.1 6-0.2 12-0.9 18.1-1 7.9-2.8 16-5.2 24-2.3 7.5-6.8 19.2-13.7 35.3"/>
</svg>`;

	function getScriptParams(key_defts) {
		var script = document.currentScript, cfg = {};
		for (var k in key_defts) {
			var deft = key_defts[k], value = script.getAttribute(k);
			cfg[k] = ((typeof deft=="number")? parseInt(value) : value) || deft; // never 0
		}
		return cfg;
	}
	var c = getScriptParams({ 秒数:15, 大小:"88px", 透明度:"90%", 数目:10, 源点:"l", 至点:"r", 颜色们:"#DB3236 #3CBA54 #4885ED #F4C20D" });
	var colors = c.颜色们.split(" ").sort(() => Math.random() - 0.5),
		style = document.createElement("style");
	document.head.appendChild(style);

	var domP = new DOMParser;
	var doc = domP.parseFromString(data, "image/svg+xml");
	function imgBallon(color) {
		var sid = `ballon_${color}`, e = document.getElementById(sid);
		if (!!e) return e;
		e = doc.documentElement.cloneNode(true);
		e.querySelector(".st0").style.fill = color;
		e.id = sid; // cached
		return e;
	}

	function addBalloon(ppair, index) {
		var p = ppair;
		var rule = `
from { left: ${p[0]}px; top: ${p[1]}px;  transform: scale(0.8); }
to { left: ${p[2]}px; top: ${p[3]}px;  transform: scale(1.2); }`;
		var sid = "fly-"+index;
		style.sheet.addRule("@keyframes "+sid, rule);
		img = imgBallon(colors[index % colors.length]);
		img.style.cssText = `animation: ${sid} ease-out ${c.秒数 * (0.9 + 0.2*Math.random())}s forwards; position: fixed; width: ${c.大小}; opacity: ${c.透明度};`;
		return document.body.appendChild(img.cloneNode(true)); // 微小的时差 (index * c.数目) 就免了，此外不知道为什么 0~3 显示不出
	}
	function applyCSSUnit(name, e, value) { // partial
		e.style[name] = value; return parseInt(getComputedStyle(e)[name]);
	}
	var size = applyCSSUnit("height", doc.documentElement, c.大小), from = c.源点=="l", to = c.至点=="r";
	function randomPos(flag) {
		if (from == false && to == true) {
			return window.innerWidth - size * (1 + Math.random()); // 这是什么玩意... 改不了了，不写了睡大觉
		} else if (from == true && to == false) {
			return size * Math.random();
		} else if (flag) {
			return window.innerWidth * !from + 8 * size * Math.random() * (to ? -1 : 1);
		}
		return window.innerWidth * to + 8 * size * Math.random() * (from ? 1 : -1);
	}
	function parsePPair(...ss) {
		let res = [];
		for (let s of ss) res.push(...s.split(",").map(parseInt));
		return res;
	}

	var eLast;
	style.sheet.addRule(".st1", "fill: none; stroke: #AEAEAE; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round;");
	for (var i = 0; i < c.数目; i++) {
		if (c.源点.length != 1)
		eLast = addBalloon([randomPos(true), window.innerHeight + size * 577 / 166 * Math.random(), randomPos(), -size * 577 / 166 * (1 + Math.random())], i);
		else
		eLast = addBalloon(parsePPair(c.源点, c.至点), i);
	}
	eLast.onanimationend = function() { // 用完当然要即销啦
		style.remove();
		document.querySelectorAll(".ballon").forEach(function(e) { e.remove(); });
	};
})();
