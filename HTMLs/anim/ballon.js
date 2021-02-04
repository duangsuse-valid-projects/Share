/*
 * Balloon.js
 * Multi-color balloons expanding and flying up from the bottom of your screen.
 * Created by Shuqiao Zhang in 2018.
 * https://zhangshuqiao.org
 * Licence: GPLv3
 */

(function() {

	var script = document.currentScript,
		duration = script.getAttribute("duration") || 15,
		delta = script.getAttribute("delta") || 0.5,
		size = script.getAttribute("size") || 88,
		opacity = script.getAttribute("opacity") || 0.9,
		count = script.getAttribute("count") || 10,
		from = script.getAttribute("from") == "l",
		to = script.getAttribute("to") == "r",
		colors = ["#DB3236", "#3CBA54", "#4885ED", "#F4C20D"].sort(() => Math.random() - 0.5),
		style = document.createElement("style");

	style.innerHTML = "";
	document.head.appendChild(style);

	function balloonSrc(color) {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 166 577" style="enable-background:new 0 0 166 577;">
		<defs>
			<style>
				.st0 { fill: ${color}; }
				.st1 { fill: none; stroke: #AEAEAE; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
			</style>
		</defs>
		<g>
			<path class="st0" d="M163.1,117c3.4-13.3,4-27,1.6-41c-1.8-10.5-5.1-20.4-9.8-29.5c-1.4-2.7-2.9-5.4-4.6-8 c-7.5-11.7-16.7-20.9-27.8-27.6C110.7,3.8,97.9,0.1,84.1,0C71-0.1,58.5,3.2,46.6,9.9c-11.4,6.5-21.1,15.4-29,26.6 c-2.3,3.2-4.3,6.5-6.1,9.9c-0.6,1-1.1,2-1.6,3c-0.2,0.3-0.3,0.7-0.5,1C5.8,58,3.2,65.9,1.6,74.2c-2.7,14.5-2.1,28.7,1.9,42.8 c4.1,14.3,10,28.6,18,42.7c3.4,6,7.1,12,11.2,17.9c10.6,15.6,23.9,31.4,39.8,47.3c2.3,2.3,4.7,4.6,7.1,6.9l-8,8.1h22l-7-8.2 c20.4-20.6,36.5-39.4,48.4-56.5C148.9,155.2,158.2,135.8,163.1,117z"/>
			<path class="st1" d="M81.1,237.7c-4,11.3-7.1,21.6-9.4,30.8c-4.5,18.3-6.9,36.3-7.2,54 c-0.2,17.7,1.6,34.5,5.4,50.4c1.6,6.7,4,14.5,7.2,23.5c1.7,4.9,3.7,10.1,5.9,15.7c6.8,17.2,11.2,29.8,13.4,37.6 c4.2,14.9,6.4,30.1,6.7,45.6c0.1,6-0.2,12-0.9,18.1c-1,7.9-2.8,16-5.2,24c-2.3,7.5-6.8,19.2-13.7,35.3"/>
		</g>
	</svg>`;
	}
	function balloon(xi, yi, xf, yf, index) {
		var img = new Image(),
			rule = `@keyframes fly-${index} {
				from {
					left: ${xi}px;
					top: ${yi}px;
					transform: scale(0.8);
				}
				to {
					left: ${xf}px;
					top: ${yf}px;
					transform: scale(1.2);
				}
			}`;
		style.innerHTML += rule;
		img.src = "data:image/svg+xml," + encodeURIComponent(balloonSrc(colors[index % colors.length]));
		img.onload = function() {
			setTimeout(function() {
				document.body.appendChild(img);
			}, index * count);
		};
		img.style.cssText = `animation: fly-${index} ${duration * (0.9 + 0.2 * Math.random())}s ease-out forwards; position: fixed; width: ${size}px; opacity: ${opacity};`;
	}
	function randomPos(flag) {
		if (from == false && to == true) {
			return window.innerWidth - size * (1 + Math.random());
		} else if (from == true && to == false) {
			return size * Math.random();
		} else if (flag) {
			return window.innerWidth * !from + 8 * size * Math.random() * (to ? -1 : 1);
		}
		return window.innerWidth * to + 8 * size * Math.random() * (from ? 1 : -1);
	}
	for (var i = 0; i < count; i++) {
		new balloon(randomPos(true), window.innerHeight + size * 577 / 166 * Math.random(), randomPos(), -size * 577 / 166 * (1 + Math.random()), i);
	}
})();