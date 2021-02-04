// http://www.websiteasteroids.com
var ASTEROIDS = ASTEROIDS || { nKill: 0, players: [] };
function Asteroids() {
	class Vector { // mutable math xy / velocity
		x:number; y:number;
		constructor(x, y) { this.x = x; this.y = y; }
		static of(x, y) { return new Vector(x, y); }
		copy() { return new Vector(this.x, this.y); }
		add(vec) {
			this.x += vec.x;
			this.y += vec.y;
			return this;
		}
		mul(factor) {
			this.x *= factor;
			this.y *= factor;
			return this;
		}
		rotate(angle) {
			const x = this.x, y = this.y;
			this.x = x * Math.cos(angle) - Math.sin(angle) * y;
			this.y = x * Math.sin(angle) + Math.cos(angle) * y;
		}
		normalize() {
			const l = this.distance();
			this.x /= l;
			this.y /= l;
			return this;
		}
		angle() {
			return Math.atan2(this.y, this.x);
		}
		setAngle(v) {
			const l = this.distance();
			this.x = Math.cos(v) * l;
			this.y = Math.sin(v) * l;
		}
		distance() {
			const l = Math.sqrt(this.x * this.x + this.y * this.y);
			if (l < 0.005 && l > -0.005) return 0;
			return l;
		}
		setDistance(v) {
			const l = this.distance();
			if (l) this.mul(v / l);
			else this.x = this.y = v;
		}
		collidesWith(rect) {
			return this.x > rect.x && this.y > rect.y && this.x < rect.x + rect.width && this.y < rect.y + rect.height;
		}
		cycleInBounds(vec) {
			const w = vec.x, h = vec.y;
			if (this.x > w) this.x = 0;
			else if (this.x < 0) this.x = w;
			if (this.y > h) this.y = 0;
			else if (this.y < 0) this.y = h;
		}
		equals(vec) {
			return typeof vec === "object" && this.x === vec.x && this.y === vec.y;
		}
		toString() {
			return `[Vector(${this.x}, ${this.y}) deg=${this.angle()}, l=${this.distance()}]`;
		}
	}

	class Line {
		p1: Vector; p2: Vector
		constructor(p1, p2) { this.p1 = p1; this.p2 = p2; }
		shift(pos:Vector) {
			this.p1.add(pos);
			this.p2.add(pos);
		}
		intersectsWithRect(rect) {
			const
			  LL = new Vector(rect.x, rect.y + rect.height),
			  LR = new Vector(rect.x + rect.width, rect.y + rect.height),
			  TL = new Vector(rect.x, rect.y),
			  TR = new Vector(rect.x + rect.width, rect.y);
			const inRect = (p:Vector) => (p.x > LL.x && p.x < TR.x) && (p.y < LL.y && p.y > TR.y);
			return (inRect(this.p1) && inRect(this.p2)) ||
				this.intersectsLine(new Line(TL, LL)) ||
				this.intersectsLine(new Line(LL, LR)) ||
				this.intersectsLine(new Line(TL, TR)) ||
				this.intersectsLine(new Line(TR, LR)) || false;
		}
		intersectsLine(line) {
			const p1 = this.p1, q1 = line.p1;
			const denom = Line.denom(this, line);
			const numerator = (v:Vector, w:Vector) => ((v.x - w.x) * (p1.y - q1.y)) - ((v.y - w.y) * (p1.x - q1.x));
			if (denom === 0.0) return false;
			return Line.inOne(numerator(line.p2, q1) / denom) && Line.inOne(numerator(this.p2, p1) / denom);
		}
		static denom(a:Line, b:Line) {
			const p1 = a.p1, p2 = a.p2;
			const q1 = b.p1, q2 = b.p2;
			return ((q2.y - q1.y) * (p2.x - p1.x)) - ((q2.x - q1.x) * (p2.y - p1.y));
		}
		static inOne(n:number) { return (n >= 0.0) && (n <= 1.0); }
	}
	const ignoredTypes = ["HTML", "HEAD", "BODY", "SCRIPT", "TITLE", "META", "STYLE", "LINK", "SHAPE", "LINE", "GROUP", "IMAGE", "STROKE", "FILL", "SKEW", "PATH", "TEXTPATH"];
	const hiddenTypes = ["BR", "HR"];
	const SEC_MS = 1000;
	const FPS = 50;
	const acc = 300;
	const maxSpeed = 600;
	const rotSpeed = 360;
	const bulletSpeed = 700;
	const particleSpeed = 400;
	const timeBetweenFire = 150;
	const timeBetweenBlink = 250;
	const bulletRadius = 2;
	const isIE = !!window.ActiveXObject;
	const maxParticles = isIE ? 20 : 40;
	const maxBullets = isIE ? 10 : 20;

	const my = this;
	let w = document.documentElement.clientWidth, h = document.documentElement.clientHeight;
	let wh = Vector.of(w, h);
	const playerWidth = 20, playerHeight = 30;
	const playerVerts = [
		[-1 * playerHeight / 2, -1 * playerWidth / 2],
		[-1 * playerHeight / 2, playerWidth / 2],
		[playerHeight / 2, 0]
	];

	this.flame = { r: [], y: [] };
	addStylesheet(".ASTEROIDSBLINK .ASTEROIDSYEAHENEMY", "outline: 2px dotted red;"); // key B
	this.toggleBlinkStyle = function() {
		if (this.updated.blink.isActive) {
			document.body.classList.remove("ASTEROIDSBLINK");
		} else {
			document.body.classList.add("ASTEROIDSBLINK");
		}
		this.updated.blink.isActive = !this.updated.blink.isActive;
	};
	this.pos = Vector.of(100, 100);
	this.lastPos = this.pos;
	this.vel = Vector.of(0, 0);
	this.dir = Vector.of(0, 1);
	this.keysPressed = {};
	this.firedAt = 0;
	this.updated = {
		enemies: false,
		flame: 0,
		blink: {
			time: 0,
			isActive: false
		}
	};
	this.scrollPos = Vector.of(0, 0);
	this.bullets = [];
	this.enemies = [];
	this.dying = [];
	this.totalEnemies = 0;
	this.particles = [];

	function updateEnemyIndex() { // key B, refresh
		for (let enemy of my.enemies) {
			enemy.classList.remove("ASTEROIDSYEAHENEMY");
		}
		const all = document.body.getElementsByTagName("*");
		my.enemies = [];
		for (let i = 0, el; el = all[i]; i++) {
			if (!(ignoredTypes.includes(el.tagName.toUpperCase())) && el.prefix !== "g_vml_" && hasOnlyTextualChildren(el) && el.className !== "ASTEROIDSYEAH" && el.offsetHeight > 0) {
				//el.aSize = size(el); //unused
				my.enemies.push(el);
				el.classList.add("ASTEROIDSYEAHENEMY");
				if (!el.aAdded) {
					el.aAdded = true;
					my.totalEnemies++;
				}
			}
		}
	}
	updateEnemyIndex();
	let createFlames: Op; // spaceship flame points
	(function() {
		const rWidth = playerWidth, rIncrease = playerWidth * 0.1, yWidth = playerWidth * 0.6, yIncrease = yWidth * 0.2, halfR = rWidth / 2, halfY = yWidth / 2, halfPlayerHeight = playerHeight / 2;
		createFlames = function() {
			my.flame.r = [
				[-1 * halfPlayerHeight, -1 * halfR]
			];
			my.flame.y = [
				[-1 * halfPlayerHeight, -1 * halfY]
			];
			for (let x = 0; x < rWidth; x += rIncrease) {
				my.flame.r.push([-random(2, 7) - halfPlayerHeight, x - halfR]);
			}
			my.flame.r.push([-1 * halfPlayerHeight, halfR]);
			for (let x = 0; x < yWidth; x += yIncrease) {
				my.flame.y.push([-random(2, 7) - halfPlayerHeight, x - halfY]);
			}
			my.flame.y.push([-1 * halfPlayerHeight, halfY]);
		}
	})();
	createFlames();

	function radians(deg) {
		return deg * Math.PI / 180;
	}

	function random(from, to) {
		return Math.floor(Math.random() * (to + 1) + from);
	}

	function size(element) {
		let el = element, left = 0, top = 0;
		do {
			left += el.offsetLeft || 0;
			top += el.offsetTop || 0;
			el = el.offsetParent;
		} while (el);
		return {
			x: left,
			y: top,
			width: element.offsetWidth || 10,
			height: element.offsetHeight || 10
		};
	}

	function applyVisibility(vis) {
		for (let p of ASTEROIDS.players) {
			p.gameContainer.style.visibility = vis;
		}
	}

	type KeySet = Set<String>
	type Op = (() => any)
	function cancelEvent(ev: Event) {
		if (ev.preventDefault) ev.preventDefault();
		if (ev.stopPropagation) ev.stopPropagation();
		ev.returnValue = false;
		ev.cancelBubble = true;
		return false;
	}
	let eventCancellers = Array(3+1);
	function eventListener<K extends keyof WindowEventMap>(self: Window, type: K, listener: (this: Window, ev: WindowEventMap[K]) => any): Op;
	function eventListener<K extends keyof DocumentEventMap>(self: Document, type: K, listener: (this: Document, ev: DocumentEventMap[K]) => any): Op // in fact adding Document|Window for param1 is enough
	function eventListener<T extends Element>(self: T, type: string, listener: (this: T, ev: Event) => any): Op {
		self.addEventListener(type, listener, false);
		return () => self.removeEventListener(type, listener, false);
	}
	function registerKeyEvents(keys:KeySet, keys_hold:KeySet) {
		let a = eventCancellers;
		a[0] = eventListener(document, "keydown", (ev) => {
			my.keysPressed[ev.key] = true;
			switch (ev.key) {
				case " ": my.firedAt = 1; break;
			}
			if (keys.has(ev.key)) return cancelEvent(ev);
		});
		a[1] = eventListener(document, "keypress", ev => { if (keys.has(ev.key)) return cancelEvent(ev); });
		a[2] = eventListener(document, "keyup", (ev) => {
			my.keysPressed[ev.key] = false;
			if (keys_hold.has(ev.key)) return false;
		});
	}

	function getElementFromPoint(x, y) {
		applyVisibility("hidden");
		let element = document.elementFromPoint(x, y);
		if (!element) {
			applyVisibility("visible");
			return false;
		}
		if (element.nodeType === 3) element = element.parentElement;
		applyVisibility("visible");
		return element;
	}

	function addParticles(startPos) {
		const time = new Date().getTime();
		const amount = maxParticles;
		for (let i = 0; i < amount; i++) {
			my.particles.push({
				dir: (new Vector(Math.random() * 20 - 10, Math.random() * 20 - 10)).normalize(),
				pos: startPos.copy(),
				cameAlive: time
			});
		}
	}

	function setScore() {
		my.points.innerHTML = ASTEROIDS.nKill * 10;
	}

	function hasOnlyTextualChildren(element) {
		if (element.offsetLeft < -100 && element.offsetWidth > 0 && element.offsetHeight > 0) return false;
		if (hiddenTypes.includes(element.tagName)) return true;
		if (element.offsetWidth === 0 && element.offsetHeight === 0) return false;
		for (let i = 0; i < element.childNodes.length; i++) {
			if (!(hiddenTypes.includes(element.childNodes[i].tagName)) && element.childNodes[i].childNodes.length !== 0) return false;
		}
		return true;
	}

	function addStylesheet(selector, rules) {
		const style = document.createElement("style");
		style.id = "ASTEROIDSYEAHSTYLES";
		try { style.innerHTML = selector + "{" + rules + "}"; }
		catch (e) { // https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet#notes
			(style.sheet as CSSStyleSheet).addRule(selector, rules);
		}
		document.head.appendChild(style);
	}

	function removeElement(id) { document.getElementById(id).remove(); }
	this.gameContainer = document.createElement("div");
	this.gameContainer.className = "ASTEROIDSYEAH";
	document.body.appendChild(this.gameContainer);
	this.canvas = document.createElement("canvas");
	this.canvas.setAttribute("width", w);
	this.canvas.setAttribute("height", h);
	this.canvas.className = "ASTEROIDSYEAH";
	Object.assign(this.canvas.style, {
		width: w + "px",
		height: h + "px",
		position: "fixed",
		top: "0px",
		left: "0px",
		bottom: "0px",
		right: "0px",
		zIndex: "10000"
	});
	this.canvas.addEventListener("mousedown", function(e) {
		const message = document.createElement("span");
		message.style.position = "absolute";
		message.style.color = "red";
		message.innerHTML = "Press Esc to Quit";
		document.body.appendChild(message);
		const x = e.pageX || (e.clientX + document.documentElement.scrollLeft);
		const y = e.pageY || (e.clientY + document.documentElement.scrollTop);
		message.style.left = x - message.offsetWidth / 2 + "px";
		message.style.top = y - message.offsetHeight / 2 + "px";
		setTimeout(function() {
			try {
				message.parentNode.removeChild(message);
			} catch (e) {}
		}, 1000);
	}, false);
	const eventResize = function() { // game resize
		my.canvas.style.display = "none";
		w = document.documentElement.clientWidth;
		h = document.documentElement.clientHeight;
		wh = Vector.of(w, h);
		my.canvas.setAttribute("width", w);
		my.canvas.setAttribute("height", h);
		Object.assign(my.canvas.style, {
			display: "block",
			width: w + "px",
			height: h + "px"
		});
	}
	eventCancellers[3] = eventListener(window, "resize", eventResize);
	this.gameContainer.appendChild(this.canvas);
	this.ctx = this.canvas.getContext("2d");
	this.ctx.fillStyle = "black";
	this.ctx.strokeStyle = "black";
	if (!document.getElementById("ASTEROIDS-NAVIGATION")) {
		this.navigation = document.createElement("div");
		this.navigation.id = "ASTEROIDS-NAVIGATION";
		this.navigation.className = "ASTEROIDSYEAH";
		Object.assign(this.navigation.style, {
			fontFamily: "Arial,sans-serif",
			position: "fixed",
			zIndex: "10001",
			bottom: "20px",
			right: "10px",
			textAlign: "right"
		});
		this.navigation.innerHTML = "(Press Esc to Quit) ";
		this.gameContainer.appendChild(this.navigation);
		this.points = document.createElement("span");
		this.points.id = "ASTEROIDS-POINTS";
		this.points.style.font = "28pt Arial, sans-serif";
		this.points.style.fontWeight = "bold";
		this.points.className = "ASTEROIDSYEAH";
		this.navigation.appendChild(this.points);
	} else {
		this.navigation = document.getElementById("ASTEROIDS-NAVIGATION");
		this.points = document.getElementById("ASTEROIDS-POINTS");
	}
	setScore();
	let keys = new Set(["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", " ", "w", "a", "s", "d"]);
	registerKeyEvents(keys, keys.add('b'));
	this.ctx.clear = function() {
		this.clearRect(0, 0, w, h);
	};
	this.ctx.clear();
	this.ctx.drawLine = function(xFrom, yFrom, xTo, yTo) {
		this.beginPath();
		this.moveTo(xFrom, yFrom);
		this.lineTo(xTo, yTo);
		this.lineTo(xTo + 1, yTo + 1);
		this.closePath();
		this.fill();
	};
	this.ctx.tracePoly = function(verts) {
		this.beginPath();
		this.moveTo(verts[0][0], verts[0][1]);
		for (let i = 1; i < verts.length; i++)
		this.lineTo(verts[i][0], verts[i][1]);
		this.closePath();
	};
	this.ctx.drawPlayer = function() {
		this.save();
		this.translate(my.pos.x, my.pos.y);
		this.rotate(my.dir.angle());
		this.tracePoly(playerVerts);
		this.fillStyle = "white";
		this.fill();
		this.tracePoly(playerVerts);
		this.stroke();
		this.restore();
	};
	this.ctx.drawBullets = function(bullets) {
		for (let i = 0; i < bullets.length; i++) {
			this.beginPath();
			this.arc(bullets[i].pos.x, bullets[i].pos.y, bulletRadius, 0, Math.PI * 2, true);
			this.closePath();
			this.fill();
		}
	};
	const randomParticleColor = function() {
		return (["red", "yellow"])[random(0, 1)];
	};
	this.ctx.drawParticles = function(particles) {
		const oldColor = this.fillStyle;
		for (let i = 0; i < particles.length; i++) {
			this.fillStyle = randomParticleColor();
			this.drawLine(particles[i].pos.x, particles[i].pos.y, particles[i].pos.x - particles[i].dir.x * 10, particles[i].pos.y - particles[i].dir.y * 10);
		}
		this.fillStyle = oldColor;
	};
	this.ctx.drawFlames = function(flame) {
		this.save();
		this.translate(my.pos.x, my.pos.y);
		this.rotate(my.dir.angle());
		const oldColor = this.strokeStyle;
		this.strokeStyle = "red";
		this.tracePoly(flame.r);
		this.stroke();
		this.strokeStyle = "yellow";
		this.tracePoly(flame.y);
		this.stroke();
		this.strokeStyle = oldColor;
		this.restore();
	}

	addParticles(this.pos); // initial animation
	document.body.classList.add("ASTEROIDSYEAH");
	let lastUpdate = performance.now();
	let FPS_MS = SEC_MS / FPS;
	let updateFunc: FrameRequestCallback;
	this.update = function(nowTime:DOMHighResTimeStamp) { // (new Date).getTime()-performance.now() // nearly constant
		let forceChange = false;
		const tDelta = (nowTime - lastUpdate);
		if (tDelta < FPS_MS) return requestAnimationFrame(updateFunc); // wait accumulate
		const delta = tDelta / SEC_MS;
		lastUpdate = nowTime;
		let drawFlame = false;
		if (nowTime - this.updated.flame > 50) {
			createFlames();
			this.updated.flame = nowTime;
		}
		this.scrollPos.x = window.pageXOffset || document.documentElement.scrollLeft;
		this.scrollPos.y = window.pageYOffset || document.documentElement.scrollTop;
		if ((this.keysPressed["ArrowUp"]) || (this.keysPressed["w"])) {
			this.vel.add(this.dir.copy().mul(acc * delta));
			drawFlame = true;
		} else {
			this.vel.mul(0.96);
		}
		if ((this.keysPressed["ArrowLeft"]) || (this.keysPressed["a"])) {
			forceChange = true;
			this.dir.rotate(radians(rotSpeed * delta * -1));
		}
		if ((this.keysPressed["ArrowRight"]) || (this.keysPressed["d"])) {
			forceChange = true;
			this.dir.rotate(radians(rotSpeed * delta));
		}
		if (this.keysPressed[" "] && nowTime - this.firedAt > timeBetweenFire) {
			this.bullets.unshift({
				dir: this.dir.copy(),
				pos: this.pos.copy(),
				startVel: this.vel.copy(),
				cameAlive: nowTime
			});
			this.firedAt = nowTime;
			if (this.bullets.length > maxBullets) {
				this.bullets.pop();
			}
		}
		if (this.keysPressed["b"]) {
			if (!this.updated.enemies) {
				updateEnemyIndex();
				this.updated.enemies = true;
			}
			forceChange = true;
			this.updated.blink.time += delta * 1000;
			if (this.updated.blink.time > timeBetweenBlink) {
				this.toggleBlinkStyle();
				this.updated.blink.time = 0;
			}
		} else {
			this.updated.enemies = false;
		}
		if (this.keysPressed["Escape"]) {
			destroy.apply(this);
			return;
		}
		if (this.vel.distance() > maxSpeed) {
			this.vel.setDistance(maxSpeed);
		}
		this.pos.add(this.vel.copy().mul(delta));
		if (this.pos.x > w) {
			window.scrollTo(this.scrollPos.x + 50, this.scrollPos.y);
			this.pos.x = 0;
		} else if (this.pos.x < 0) {
			window.scrollTo(this.scrollPos.x - 50, this.scrollPos.y);
			this.pos.x = w;
		}
		if (this.pos.y > h) {
			window.scrollTo(this.scrollPos.x, this.scrollPos.y + h * 0.75);
			this.pos.y = 0;
		} else if (this.pos.y < 0) {
			window.scrollTo(this.scrollPos.x, this.scrollPos.y - h * 0.75);
			this.pos.y = h;
		}
		for (let i = this.bullets.length - 1; i >= 0; i--) {
			if (nowTime - this.bullets[i].cameAlive > 2000) {
				this.bullets.splice(i, 1);
				forceChange = true;
				continue;
			}
			const bulletVel = this.bullets[i].dir.copy()
			bulletVel.setDistance(bulletSpeed * delta);
			bulletVel.add(this.bullets[i].startVel.copy().mul(delta));
			this.bullets[i].pos.add(bulletVel).cycleInBounds(wh);
			const murdered = getElementFromPoint(this.bullets[i].pos.x, this.bullets[i].pos.y);
			if (murdered && murdered.tagName && !(ignoredTypes.includes(murdered.tagName.toUpperCase())) && hasOnlyTextualChildren(murdered) && murdered.className !== "ASTEROIDSYEAH") {
				addParticles(this.bullets[i].pos);
				this.dying.push(murdered); // key space
				this.bullets.splice(i, 1);
				continue;
			}
		}
		if (this.dying.length) {
			for (let i = this.dying.length - 1; i >= 0; i--) {
				try {
					if (this.dying[i].parentNode) ASTEROIDS.nKill++;
					this.dying[i].parentNode.removeChild(this.dying[i]);
				} catch (e) {}
			}
			setScore();
			this.dying = [];
		}
		for (let i = this.particles.length - 1; i >= 0; i--) {
			this.particles[i].pos.add(this.particles[i].dir.copy().mul(particleSpeed * delta * Math.random()));
			if (nowTime - this.particles[i].cameAlive > 1000) {
				this.particles.splice(i, 1);
				forceChange = true;
				continue;
			}
		}
		if (forceChange || this.bullets.length !== 0 || this.particles.length !== 0 || !this.pos.is(this.lastPos) || this.vel.distance() > 0) {
			this.ctx.clear();
			this.ctx.drawPlayer();
			if (drawFlame) this.ctx.drawFlames(my.flame);
			if (this.bullets.length) {
				this.ctx.drawBullets(this.bullets);
			}
			if (this.particles.length) {
				this.ctx.drawParticles(this.particles);
			}
		}
		this.lastPos = this.pos;
		return requestAnimationFrame(updateFunc);
	}
	updateFunc = this.update.bind(this);
	requestAnimationFrame(updateFunc);

	function destroy() {
		for (let op of eventCancellers) op();
		removeElement("ASTEROIDSYEAHSTYLES");
		document.body.classList.remove("ASTEROIDSYEAH");
		this.gameContainer.parentNode.removeChild(this.gameContainer);
	}
}

ASTEROIDS.players.push(new Asteroids());
