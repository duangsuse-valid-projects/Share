// Rewrite of http://www.websiteasteroids.com
var ASTEROIDS = ASTEROIDS || { nKill: 0, players: [] };

class Vec2 { // mutable math xy, or rotation / velocity
	x:number; y:number;
	constructor(x, y) { this.x = x; this.y = y; }
	copy() { return new Vec2(this.x, this.y); }

	add(vec) { this.x += vec.x; this.y += vec.y; return this; }
	mul(factor) { this.x *= factor; this.y *= factor; return this; }
	angle() { return Math.atan2(this.y, this.x); }
	rotate(angle) { // radians
		const x = this.x, y = this.y;
		const {sin, cos} = Math;
		this.x = x * cos(angle) - sin(angle) * y;
		this.y = x * sin(angle) + cos(angle) * y;
	}
	rotateTo(v) { // setAngle
		const l = this.distance();
		this.x = Math.cos(v) * l;
		this.y = Math.sin(v) * l;
	}

	distance() {
		const l = Math.sqrt(this.x * this.x + this.y * this.y);
		return this.discardMinor(l);
	}
	discardMinor(n) { return (-0.005 <n&&n< 0.005)? 0 : n; }
	setDistance(v) {
		const l = this.distance();
		if (l) this.mul(v / l);
		else this.x = this.y = v;
	}
	normalize() {
		const l = this.distance();
		this.x /= l;
		this.y /= l;
		return this;
	}
	cycleInBounds(vec) {
		const w = vec.x, h = vec.y; // reassign if outbounds
		if (this.x > w) this.x = 0;
		else if (this.x < 0) this.x = w;
		if (this.y > h) this.y = 0;
		else if (this.y < 0) this.y = h;
	}
	equals(vec) {
		return typeof vec === "object" && (this.x === vec.x && this.y === vec.y);
	}
	toString() {
		return `[Vector(${this.x}, ${this.y}) rad=${this.angle()}, l=${this.distance()}]`;
	}
}
const SEC_MS = 1000;
function textSet(s, sep=" ") { return new Set(s.split(sep)); }
const maths = {
	radians: (deg) => deg * Math.PI / 180,
	random: (first, last) => Math.floor(Math.random() * (last + 1) + first),
	pick: (a) => a[maths.random(0, a.length-1)]
};

function Asteroids() {
	const doms = { // I'm not happy about this
		addStylesheet(selector, rules) {
			const style = document.createElement("style");
			try { style.innerHTML = selector + "{" + rules + "}"; }
			catch (e) { // https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet#notes
				(style.sheet as CSSStyleSheet).addRule(selector, rules);
			}
			return document.head.appendChild(style);
		},
		removeElement(id) { document.getElementById(id).remove(); },
		px: (s) => `${s}px`
	};

	const ASTER = "ASTEROIDS";
	const isIE = window.ActiveXObject;
	const cfg = {
		ignoredTypes: textSet("HTML HEAD TITLE META BODY SCRIPT STYLE LINK SHAPE LINE GROUP IMAGE STROKE FILL SKEW PATH TEXTPATH"),
		hiddenTypes: textSet("BR HR"),
		cssYeah: ASTER+"YEAH",
		cssEnemy: ASTER+"YEAHENEMY",
		cssBlink: ASTER+"BLINK",
		eidNavi: ASTER+"-NAVIGATION",
		eidPoints: ASTER+"-POINTS",
		eidStyles: ASTER+"YEAHSTYLES",
		whPlayer: [20, 30],
		speeds: {
			ship: [300, 600],
			bullet: 700,
			particle: 400
		},
		rotateSpeeds: {
			ship: 360
		},
		rateLimit: {
			fire: 150,
			blink: 250
		},
		keyBind: {
			fire: " ",
			blink: "b"
		},
		countLimit: {
			particle: isIE? 20:40,
			maxBullets: isIE? 10:20,
		},
		timeLimit: {
			particle: 1000 // and bullet, in NEW refactor
		},
		acc: 300,
		maxSpeed: 600,
		rotSpeed: 360,
		bulletSpeed: 700,
		particleSpeed: 400,
		timeBetweenFire: 150,
		timeBetweenBlink: 250,
		bulletRadius: 2,
		bulletAlive: 2000,
		maxParticles: isIE? 20 : 40,
		maxBullets: isIE? 10 : 20
	};

	const my = this;
	let w: number, h: number, wh: Vec2; // init in canvasResize
	const [wPlayer, hPlayer] = cfg.whPlayer;
	const playerVerts = [
		[-1 * hPlayer / 2, -1 * wPlayer / 2], // triangle
		[-1 * hPlayer / 2, wPlayer / 2],
		[hPlayer / 2, 0]
	];

	this.flame = { r: [], y: [] };
	doms.addStylesheet(`.${cfg.cssBlink} .${cfg.cssEnemy}`, "outline: 2px dotted red;").id = cfg.eidStyles; // for key B
	this.pos = new Vec2(100, 100);
	this.dir = new Vec2(0, 1);
	this.vel = new Vec2(0, 0);
	this.lastPos = this.pos;

	this.keysPressed = {};
	this.updated = {
		ids: [],
		flame: 0,
		time: { blink: 0, fire: 0 }
	};
	this.scrollPos = new Vec2(0, 0);
	this.bullets = [];
	this.enemies = [];
	this.dying = [];
	this.particles = [];

	const canvasResize = function(ev) { // game resize
		const hasInit = ev!==null;
		if(hasInit) my.canvas.style.display = "none";
		w = document.documentElement.clientWidth; h = document.documentElement.clientHeight;
		wh = new Vec2(w, h);
		my.canvas.setAttribute("width", w);
		my.canvas.setAttribute("height", h);
		if(hasInit) Object.assign(my.canvas.style, {
			display: "block",
			width: doms.px(w),
			height: doms.px(h)
		});
	}

	function updateEnemyIndex() { // key B, refresh
		for (let enemy of my.enemies) {
			enemy.classList.remove(cfg.cssEnemy);
		}
		my.enemies = [];
		for (let el of Array.from(document.body.getElementsByTagName("*"))) {
			if (!(el instanceof HTMLElement)) continue;
			if (!cfg.ignoredTypes.has(el.tagName.toUpperCase()) && el.prefix !== "g_vml_" && hasOnlyTextualChildren(el) && (el.className !== cfg.cssYeah) && el.offsetHeight > 0) {
				my.enemies.push(el);
				el.classList.add(cfg.cssEnemy);
			}
		}
	}
	updateEnemyIndex();
	let createFlames: Op; // spaceship flame points
	(function() {
		const rWidth = wPlayer, rIncrease = wPlayer * 0.1, yWidth = wPlayer * 0.6, yIncrease = yWidth * 0.2, halfR = rWidth / 2, halfY = yWidth / 2, halfPlayerHeight = hPlayer / 2;
		createFlames = function() {
			my.flame.r = [
				[-1 * halfPlayerHeight, -1 * halfR]
			];
			my.flame.y = [
				[-1 * halfPlayerHeight, -1 * halfY]
			];
			for (let x = 0; x < rWidth; x += rIncrease) {
				my.flame.r.push([-maths.random(2, 7) - halfPlayerHeight, x - halfR]);
			}
			my.flame.r.push([-1 * halfPlayerHeight, halfR]);
			for (let x = 0; x < yWidth; x += yIncrease) {
				my.flame.y.push([-maths.random(2, 7) - halfPlayerHeight, x - halfY]);
			}
			my.flame.y.push([-1 * halfPlayerHeight, halfY]);
		}
	})();
	createFlames();

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

	eventCancellers[3] = eventListener(window, "resize", canvasResize);
	function registerKeyEvents(keys:KeySet, keys_hold:KeySet) {
		let a = eventCancellers;
		a[0] = eventListener(document, "keydown", (ev) => {
			my.keysPressed[ev.key] = true;
			if (keys.has(ev.key)) return cancelEvent(ev);
		});
		a[1] = eventListener(document, "keypress", ev => { if (keys.has(ev.key)) return cancelEvent(ev); });
		a[2] = eventListener(document, "keyup", (ev) => {
			my.keysPressed[ev.key] = false;
			if (keys_hold.has(ev.key)) return false;
		});
	}

	function getElementFromPoint(x, y) {
		makeShipsVisible(false);
		let element = document.elementFromPoint(x, y);
		if (!element) {
			makeShipsVisible(true);
			return false;
		}
		if (element.nodeType === 3) element = element.parentElement;
		makeShipsVisible(true);
		return element;
	}
	function makeShipsVisible(v) {
		for (let p of ASTEROIDS.players) {
			p.gameContainer.style.visibility = v? "visible" : "hidden";
		}
	}

	function addParticles(startPos) {
		const time = performance.now();
		const amount = cfg.maxParticles; // game particle limit
		for (let i = 0; i < amount; i++) {
			my.particles.push({
				dir: (new Vec2(Math.random() * 20 - 10, Math.random() * 20 - 10)).normalize(),
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
		if (cfg.hiddenTypes.has(element.tagName)) return true;
		if (element.offsetWidth === 0 && element.offsetHeight === 0) return false;
		for (let i = 0; i < element.childNodes.length; i++) {
			if (!(cfg.hiddenTypes.has(element.childNodes[i].tagName)) && element.childNodes[i].childNodes.length !== 0) return false;
		}
		return true;
	}

	function el<K extends keyof HTMLElementTagNameMap>(tagName:K, confs, ...childs): HTMLElementTagNameMap[K] {
		let e = document.createElement(tagName);
		if (typeof confs == "function") confs(e); else for (let conf of confs) conf(e);
		for (let e1 of childs) e.appendChild(e1);
		return e;
	}
	const sets = k=>v=>e=> { e[k] = v; },
		withClass = sets("className"), withText = sets("innerText"), withID = sets("id"),
		withStyle = o=>e=> { Object.assign(e.style, o); };
	this.gameContainer = el("div", withClass(cfg.cssYeah),
		this.canvas = el("canvas", [withClass(cfg.cssYeah), withStyle({ // init game display
			position: "fixed",
			top: "0px",
			left: "0px",
			bottom: "0px",
			right: "0px",
			zIndex: "10000"
		})])
	);
	document.body.appendChild(this.gameContainer);
	canvasResize(null);
	this.canvas.addEventListener("mousedown", (ev) => { // game click
		const x = ev.pageX || (ev.clientX + document.documentElement.scrollLeft);
		const y = ev.pageY || (ev.clientY + document.documentElement.scrollTop);
		const message = document.body.appendChild(el("span", [
			withText("Press Esc to Quit"),
			it => withStyle({
				color: "red",
				position: "absolute",
				left: doms.px(x - it.offsetWidth / 2), top: doms.px(y - it.offsetHeight / 2)
			})(it)
		]));
		setTimeout(() => {
			try { message.parentNode.removeChild(message); } catch (e) {}
		}, 1000);
	}, false);

	this.ctx = this.canvas.getContext("2d");
	this.ctx.fillStyle = "black";
	this.ctx.strokeStyle = "black";
	if (!document.getElementById(cfg.eidNavi)) { // game right-corner
		this.navigation = el("div", [
			withID(cfg.eidNavi), withClass(cfg.cssYeah),
				withStyle({
					fontFamily: "Arial,sans-serif",
					position: "fixed",
					zIndex: "10001",
					bottom: "20px",
					right: "10px",
					textAlign: "right"
				}),
				withText("(Press Esc to Quit) ")
			],
			this.points = el("span", [
				withID(cfg.eidPoints), withClass(cfg.cssYeah),
				withStyle({ font: "28pt Arial, sans-serif", fontWeight: "bold" })
			])
		);
		this.gameContainer.appendChild(this.navigation);
	} else {
		this.navigation = document.getElementById(cfg.eidNavi); // remove this partial-implemented feature (gameContainer&canvas is not checked), maybe?
		this.points = document.getElementById(cfg.eidPoints);
	}
	setScore();
	let keys = new Set(["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", " ", "w", "a", "s", "d"]);
	registerKeyEvents(keys, keys.add('b'));

	this.ctx.clear = function() { //v begin canvas-render part
		this.clearRect(0, 0, w, h);
	};
	this.ctx.clear();
	this.ctx.drawLine = function(xFrom, yFrom, xTo, yTo) { // drawing lib
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
			this.arc(bullets[i].pos.x, bullets[i].pos.y, cfg.bulletRadius, 0, Math.PI * 2, true);
			this.closePath();
			this.fill();
		}
	};
	const particleColors = ["red", "yellow"];
	this.ctx.drawParticles = function(particles) {
		const oldColor = this.fillStyle;
		for (let i = 0; i < particles.length; i++) {
			this.fillStyle = maths.pick(particleColors);
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
	document.body.classList.add(cfg.cssYeah);
	function refreshMainloop(func:(time:number, delta:number, next:Op)=>any): Op {
		let next: Op;
		let lastUpdate = performance.now(); // (new Date).getTime()-performance.now() //nearly constant
		const handler: FrameRequestCallback = (time) => {
			const tDelta = (time - lastUpdate);
			const delta = tDelta / SEC_MS;
			lastUpdate = time; func(time, delta, next);
		};
		next = () => requestAnimationFrame(handler);
		return next;
	}
	function roundUpdate(id: string, op: Op) {
		my.updated.ids.push(id);
		my.updated[id] = false;
		return () => { if (my.updated[id])return; op(); my.updated[id] = true; }; // scheudled to remove
	}
	const updateEnemies = roundUpdate("enemies", updateEnemyIndex);
	function calcMoveForward(phy, delta) {
		const bv = phy.dir.copy();
		bv.setDistance(cfg.bulletSpeed * delta);
		bv.add(phy.startVel.copy().mul(delta));
		phy.pos.add(bv).cycleInBounds(wh);
	}
	function calcExplode(phy, delta) {
		phy.pos.add(phy.dir.copy().mul(cfg.particleSpeed * delta * Math.random()));
	}
	this.update = function(nowTime:number, delta:number, next:Op) { // next() should be replaced by exit() event dispatch
		let forceChange = false;
		let drawFlame = false;
		if (nowTime - this.updated.flame > 50) {
			createFlames();
			this.updated.flame = nowTime;
		}
		this.scrollPos.x = window.pageXOffset || document.documentElement.scrollLeft;
		this.scrollPos.y = window.pageYOffset || document.documentElement.scrollTop;
		if ((this.keysPressed["ArrowUp"]) || (this.keysPressed["w"])) {
			this.vel.add(this.dir.copy().mul(cfg.acc * delta));
			drawFlame = true;
		} else {
			this.vel.mul(0.96);
		}
		if ((this.keysPressed["ArrowLeft"]) || (this.keysPressed["a"])) {
			forceChange = true;
			this.dir.rotate(maths.radians(cfg.rotSpeed * delta * -1));
		}
		if ((this.keysPressed["ArrowRight"]) || (this.keysPressed["d"])) {
			forceChange = true;
			this.dir.rotate(maths.radians(cfg.rotSpeed * delta));
		}
		function keyPressedAction(id: string, op: Op) {
			if (my.keysPressed[cfg.keyBind[id]] && nowTime - my.updated.time[id] > cfg.rateLimit[id]) {
				op(); my.updated.time[id] = nowTime;
			}
		}
		keyPressedAction("fire", () => {
			if (this.bullets.length+1 > cfg.maxBullets) { return }
			this.bullets.unshift({
				dir: this.dir.copy(),
				pos: this.pos.copy(),
				startVel: this.vel.copy(),
				cameAlive: nowTime
			});
		});
		keyPressedAction("blink", () => {
			updateEnemies();
			forceChange = true;
			document.body.classList.toggle(cfg.cssBlink);
			this.updated.time.blink = nowTime;
		});
		if (this.keysPressed["Escape"]) {
			destroy.apply(this);
			return;
		}
		if (this.vel.distance() > cfg.maxSpeed) {
			this.vel.setDistance(cfg.maxSpeed);
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
		for (let i = this.bullets.length - 1; i != -1; i--) {
			let bullet = this.bullets[i];
			if (nowTime - bullet.cameAlive > cfg.bulletAlive) { // Time to live
				this.bullets.splice(i, 1); // require idx
				forceChange = true;
				continue;
			}
			calcMoveForward(bullet, delta);
			const murdered = getElementFromPoint(bullet.pos.x, bullet.pos.y);
			if (murdered && murdered.tagName && !(cfg.ignoredTypes.has(murdered.tagName.toUpperCase())) && hasOnlyTextualChildren(murdered) && murdered.className !== cfg.cssYeah) {
				addParticles(bullet.pos);
				this.dying.push(murdered); // key space
				this.bullets.splice(i, 1);
				continue;
			}
		}
		for (let i = this.dying.length - 1; i != -1; i--) {
			try {
				if (this.dying[i].parentNode) ASTEROIDS.nKill++;
				this.dying[i].parentNode.removeChild(this.dying[i]);
			} catch (e) {}
		}
		setScore();
		this.dying = [];

		for (let i = this.particles.length - 1; i != -1; i--) {
			let particle = this.particles[i];
			calcExplode(particle, delta);
			if (nowTime - this.particles[i].cameAlive > 1000) {
				this.particles.splice(i, 1);
				forceChange = true;
				continue;
			}
		}
		if (forceChange || this.bullets.length !== 0 || this.particles.length !== 0 || !this.pos.equals(this.lastPos) || this.vel.distance() > 0) {
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
		for (let k of this.updated.ids) this.updated[k] = false;
		next();
	}
	refreshMainloop(this.update.bind(this))();

	function destroy() {
		for (let op of eventCancellers) op();
		doms.removeElement(cfg.eidStyles);
		document.body.classList.remove(cfg.cssYeah);
		this.gameContainer.parentNode.removeChild(this.gameContainer);
	}
}

ASTEROIDS.players.push(new Asteroids());
