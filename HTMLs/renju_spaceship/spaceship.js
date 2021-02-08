var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
// Rewrite of http://www.websiteasteroids.com
var ASTEROIDS = ASTEROIDS || { nKill: 0, players: [] };
var Vec2 = /** @class */ (function () {
    function Vec2(x, y) {
        this.x = x;
        this.y = y;
    }
    Vec2.prototype.copy = function () { return new Vec2(this.x, this.y); };
    Vec2.prototype.add = function (vec) { this.x += vec.x; this.y += vec.y; return this; };
    Vec2.prototype.mul = function (factor) { this.x *= factor; this.y *= factor; return this; };
    Vec2.prototype.angle = function () { return Math.atan2(this.y, this.x); };
    Vec2.prototype.rotate = function (angle) {
        var x = this.x, y = this.y;
        var sin = Math.sin, cos = Math.cos;
        this.x = x * cos(angle) - sin(angle) * y;
        this.y = x * sin(angle) + cos(angle) * y;
    };
    Vec2.prototype.rotateTo = function (v) {
        var l = this.distance();
        this.x = Math.cos(v) * l;
        this.y = Math.sin(v) * l;
    };
    Vec2.prototype.distance = function () {
        var l = Math.sqrt(this.x * this.x + this.y * this.y);
        return this.discardMinor(l);
    };
    Vec2.prototype.discardMinor = function (n) { return (-0.005 < n && n < 0.005) ? 0 : n; };
    Vec2.prototype.setDistance = function (v) {
        var l = this.distance();
        if (l)
            this.mul(v / l);
        else
            this.x = this.y = v;
    };
    Vec2.prototype.normalize = function () {
        var l = this.distance();
        this.x /= l;
        this.y /= l;
        return this;
    };
    Vec2.prototype.cycleInBounds = function (vec) {
        var w = vec.x, h = vec.y; // reassign if outbounds
        if (this.x > w)
            this.x = 0;
        else if (this.x < 0)
            this.x = w;
        if (this.y > h)
            this.y = 0;
        else if (this.y < 0)
            this.y = h;
    };
    Vec2.prototype.equals = function (vec) {
        return typeof vec === "object" && (this.x === vec.x && this.y === vec.y);
    };
    Vec2.prototype.toString = function () {
        return "[Vector(" + this.x + ", " + this.y + ") rad=" + this.angle() + ", l=" + this.distance() + "]";
    };
    return Vec2;
}());
var SEC_MS = 1000;
function textSet(s, sep) {
    if (sep === void 0) { sep = " "; }
    return new Set(s.split(sep));
}
var maths = {
    radians: function (deg) { return deg * Math.PI / 180; },
    random: function (first, last) { return Math.floor(Math.random() * (last + 1) + first); },
    pick: function (a) { return a[maths.random(0, a.length - 1)]; }
};
function Asteroids() {
    var doms = {
        addStylesheet: function (selector, rules) {
            var style = document.createElement("style");
            try {
                style.innerHTML = selector + "{" + rules + "}";
            }
            catch (e) { // https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet#notes
                style.sheet.addRule(selector, rules);
            }
            return document.head.appendChild(style);
        },
        removeElement: function (id) { document.getElementById(id).remove(); },
        px: function (s) { return s + "px"; }
    };
    var ASTER = "ASTEROIDS";
    var isIE = window.ActiveXObject;
    var cfg = {
        ignoredTypes: textSet("HTML HEAD TITLE META BODY SCRIPT STYLE LINK SHAPE LINE GROUP IMAGE STROKE FILL SKEW PATH TEXTPATH"),
        hiddenTypes: textSet("BR HR"),
        cssYeah: ASTER + "YEAH",
        cssEnemy: ASTER + "YEAHENEMY",
        cssBlink: ASTER + "BLINK",
        eidNavi: ASTER + "-NAVIGATION",
        eidPoints: ASTER + "-POINTS",
        eidStyles: ASTER + "YEAHSTYLES",
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
            particle: isIE ? 20 : 40,
            maxBullets: isIE ? 10 : 20
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
        maxParticles: isIE ? 20 : 40,
        maxBullets: isIE ? 10 : 20
    };
    var my = this;
    var w, h, wh; // init in canvasResize
    var _a = __read(cfg.whPlayer, 2), wPlayer = _a[0], hPlayer = _a[1];
    var playerVerts = [
        [-1 * hPlayer / 2, -1 * wPlayer / 2],
        [-1 * hPlayer / 2, wPlayer / 2],
        [hPlayer / 2, 0]
    ];
    this.flame = { r: [], y: [] };
    doms.addStylesheet("." + cfg.cssBlink + " ." + cfg.cssEnemy, "outline: 2px dotted red;").id = cfg.eidStyles; // for key B
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
    var canvasResize = function (ev) {
        var hasInit = ev !== null;
        if (hasInit)
            my.canvas.style.display = "none";
        w = document.documentElement.clientWidth;
        h = document.documentElement.clientHeight;
        wh = new Vec2(w, h);
        my.canvas.setAttribute("width", w);
        my.canvas.setAttribute("height", h);
        if (hasInit)
            Object.assign(my.canvas.style, {
                display: "block",
                width: doms.px(w),
                height: doms.px(h)
            });
    };
    function updateEnemyIndex() {
        var e_1, _a, e_2, _b;
        try {
            for (var _c = __values(my.enemies), _d = _c.next(); !_d.done; _d = _c.next()) {
                var enemy = _d.value;
                enemy.classList.remove(cfg.cssEnemy);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c["return"])) _a.call(_c);
            }
            finally { if (e_1) throw e_1.error; }
        }
        my.enemies = [];
        try {
            for (var _e = __values(Array.from(document.body.getElementsByTagName("*"))), _f = _e.next(); !_f.done; _f = _e.next()) {
                var el_1 = _f.value;
                if (!(el_1 instanceof HTMLElement))
                    continue;
                if (!cfg.ignoredTypes.has(el_1.tagName.toUpperCase()) && el_1.prefix !== "g_vml_" && hasOnlyTextualChildren(el_1) && (el_1.className !== cfg.cssYeah) && el_1.offsetHeight > 0) {
                    my.enemies.push(el_1);
                    el_1.classList.add(cfg.cssEnemy);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e["return"])) _b.call(_e);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    updateEnemyIndex();
    var createFlames; // spaceship flame points
    (function () {
        var rWidth = wPlayer, rIncrease = wPlayer * 0.1, yWidth = wPlayer * 0.6, yIncrease = yWidth * 0.2, halfR = rWidth / 2, halfY = yWidth / 2, halfPlayerHeight = hPlayer / 2;
        createFlames = function () {
            my.flame.r = [
                [-1 * halfPlayerHeight, -1 * halfR]
            ];
            my.flame.y = [
                [-1 * halfPlayerHeight, -1 * halfY]
            ];
            for (var x = 0; x < rWidth; x += rIncrease) {
                my.flame.r.push([-maths.random(2, 7) - halfPlayerHeight, x - halfR]);
            }
            my.flame.r.push([-1 * halfPlayerHeight, halfR]);
            for (var x = 0; x < yWidth; x += yIncrease) {
                my.flame.y.push([-maths.random(2, 7) - halfPlayerHeight, x - halfY]);
            }
            my.flame.y.push([-1 * halfPlayerHeight, halfY]);
        };
    })();
    createFlames();
    function cancelEvent(ev) {
        if (ev.preventDefault)
            ev.preventDefault();
        if (ev.stopPropagation)
            ev.stopPropagation();
        ev.returnValue = false;
        ev.cancelBubble = true;
        return false;
    }
    var eventCancellers = Array(3 + 1);
    function eventListener(self, type, listener) {
        self.addEventListener(type, listener, false);
        return function () { return self.removeEventListener(type, listener, false); };
    }
    eventCancellers[3] = eventListener(window, "resize", canvasResize);
    function registerKeyEvents(keys, keys_hold) {
        var a = eventCancellers;
        a[0] = eventListener(document, "keydown", function (ev) {
            my.keysPressed[ev.key] = true;
            if (keys.has(ev.key))
                return cancelEvent(ev);
        });
        a[1] = eventListener(document, "keypress", function (ev) { if (keys.has(ev.key))
            return cancelEvent(ev); });
        a[2] = eventListener(document, "keyup", function (ev) {
            my.keysPressed[ev.key] = false;
            if (keys_hold.has(ev.key))
                return false;
        });
    }
    function getElementFromPoint(x, y) {
        makeShipsVisible(false);
        var element = document.elementFromPoint(x, y);
        if (!element) {
            makeShipsVisible(true);
            return false;
        }
        if (element.nodeType === 3)
            element = element.parentElement;
        makeShipsVisible(true);
        return element;
    }
    function makeShipsVisible(v) {
        var e_3, _a;
        try {
            for (var _b = __values(ASTEROIDS.players), _c = _b.next(); !_c.done; _c = _b.next()) {
                var p = _c.value;
                p.gameContainer.style.visibility = v ? "visible" : "hidden";
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
    }
    function addParticles(startPos) {
        var time = performance.now();
        var amount = cfg.maxParticles; // game particle limit
        for (var i = 0; i < amount; i++) {
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
        if (element.offsetLeft < -100 && element.offsetWidth > 0 && element.offsetHeight > 0)
            return false;
        if (cfg.hiddenTypes.has(element.tagName))
            return true;
        if (element.offsetWidth === 0 && element.offsetHeight === 0)
            return false;
        for (var i = 0; i < element.childNodes.length; i++) {
            if (!(cfg.hiddenTypes.has(element.childNodes[i].tagName)) && element.childNodes[i].childNodes.length !== 0)
                return false;
        }
        return true;
    }
    function el(tagName, confs) {
        var e_4, _a, e_5, _b;
        var childs = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            childs[_i - 2] = arguments[_i];
        }
        var e = document.createElement(tagName);
        if (typeof confs == "function")
            confs(e);
        else
            try {
                for (var confs_1 = __values(confs), confs_1_1 = confs_1.next(); !confs_1_1.done; confs_1_1 = confs_1.next()) {
                    var conf = confs_1_1.value;
                    conf(e);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (confs_1_1 && !confs_1_1.done && (_a = confs_1["return"])) _a.call(confs_1);
                }
                finally { if (e_4) throw e_4.error; }
            }
        try {
            for (var childs_1 = __values(childs), childs_1_1 = childs_1.next(); !childs_1_1.done; childs_1_1 = childs_1.next()) {
                var e1 = childs_1_1.value;
                e.appendChild(e1);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (childs_1_1 && !childs_1_1.done && (_b = childs_1["return"])) _b.call(childs_1);
            }
            finally { if (e_5) throw e_5.error; }
        }
        return e;
    }
    var sets = function (k) { return function (v) { return function (e) { e[k] = v; }; }; }, withClass = sets("className"), withText = sets("innerText"), withID = sets("id"), withStyle = function (o) { return function (e) { Object.assign(e.style, o); }; };
    this.gameContainer = el("div", withClass(cfg.cssYeah), this.canvas = el("canvas", [withClass(cfg.cssYeah), withStyle({
            position: "fixed",
            top: "0px",
            left: "0px",
            bottom: "0px",
            right: "0px",
            zIndex: "10000"
        })]));
    document.body.appendChild(this.gameContainer);
    canvasResize(null);
    this.canvas.addEventListener("mousedown", function (ev) {
        var x = ev.pageX || (ev.clientX + document.documentElement.scrollLeft);
        var y = ev.pageY || (ev.clientY + document.documentElement.scrollTop);
        var message = document.body.appendChild(el("span", [
            withText("Press Esc to Quit"),
            function (it) { return withStyle({
                color: "red",
                position: "absolute",
                left: doms.px(x - it.offsetWidth / 2), top: doms.px(y - it.offsetHeight / 2)
            })(it); }
        ]));
        setTimeout(function () {
            try {
                message.parentNode.removeChild(message);
            }
            catch (e) { }
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
        ], this.points = el("span", [
            withID(cfg.eidPoints), withClass(cfg.cssYeah),
            withStyle({ font: "28pt Arial, sans-serif", fontWeight: "bold" })
        ]));
        this.gameContainer.appendChild(this.navigation);
    }
    else {
        this.navigation = document.getElementById(cfg.eidNavi); // remove this partial-implemented feature (gameContainer&canvas is not checked), maybe?
        this.points = document.getElementById(cfg.eidPoints);
    }
    setScore();
    var keys = new Set(["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", " ", "w", "a", "s", "d"]);
    registerKeyEvents(keys, keys.add('b'));
    this.ctx.clear = function () {
        this.clearRect(0, 0, w, h);
    };
    this.ctx.clear();
    this.ctx.drawLine = function (xFrom, yFrom, xTo, yTo) {
        this.beginPath();
        this.moveTo(xFrom, yFrom);
        this.lineTo(xTo, yTo);
        this.lineTo(xTo + 1, yTo + 1);
        this.closePath();
        this.fill();
    };
    this.ctx.tracePoly = function (verts) {
        this.beginPath();
        this.moveTo(verts[0][0], verts[0][1]);
        for (var i = 1; i < verts.length; i++)
            this.lineTo(verts[i][0], verts[i][1]);
        this.closePath();
    };
    this.ctx.drawPlayer = function () {
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
    this.ctx.drawBullets = function (bullets) {
        for (var i = 0; i < bullets.length; i++) {
            this.beginPath();
            this.arc(bullets[i].pos.x, bullets[i].pos.y, cfg.bulletRadius, 0, Math.PI * 2, true);
            this.closePath();
            this.fill();
        }
    };
    var particleColors = ["red", "yellow"];
    this.ctx.drawParticles = function (particles) {
        var oldColor = this.fillStyle;
        for (var i = 0; i < particles.length; i++) {
            this.fillStyle = maths.pick(particleColors);
            this.drawLine(particles[i].pos.x, particles[i].pos.y, particles[i].pos.x - particles[i].dir.x * 10, particles[i].pos.y - particles[i].dir.y * 10);
        }
        this.fillStyle = oldColor;
    };
    this.ctx.drawFlames = function (flame) {
        this.save();
        this.translate(my.pos.x, my.pos.y);
        this.rotate(my.dir.angle());
        var oldColor = this.strokeStyle;
        this.strokeStyle = "red";
        this.tracePoly(flame.r);
        this.stroke();
        this.strokeStyle = "yellow";
        this.tracePoly(flame.y);
        this.stroke();
        this.strokeStyle = oldColor;
        this.restore();
    };
    addParticles(this.pos); // initial animation
    document.body.classList.add(cfg.cssYeah);
    function refreshMainloop(func) {
        var next;
        var lastUpdate = performance.now(); // (new Date).getTime()-performance.now() //nearly constant
        var handler = function (time) {
            var tDelta = (time - lastUpdate);
            var delta = tDelta / SEC_MS;
            lastUpdate = time;
            func(time, delta, next);
        };
        next = function () { return requestAnimationFrame(handler); };
        return next;
    }
    function roundUpdate(id, op) {
        my.updated.ids.push(id);
        my.updated[id] = false;
        return function () { if (my.updated[id])
            return; op(); my.updated[id] = true; }; // scheudled to remove
    }
    var updateEnemies = roundUpdate("enemies", updateEnemyIndex);
    function calcMoveForward(phy, delta) {
        var bv = phy.dir.copy();
        bv.setDistance(cfg.bulletSpeed * delta);
        bv.add(phy.startVel.copy().mul(delta));
        phy.pos.add(bv).cycleInBounds(wh);
    }
    function calcExplode(phy, delta) {
        phy.pos.add(phy.dir.copy().mul(cfg.particleSpeed * delta * Math.random()));
    }
    this.update = function (nowTime, delta, next) {
        var e_6, _a;
        var _this = this;
        var forceChange = false;
        var drawFlame = false;
        if (nowTime - this.updated.flame > 50) {
            createFlames();
            this.updated.flame = nowTime;
        }
        this.scrollPos.x = window.pageXOffset || document.documentElement.scrollLeft;
        this.scrollPos.y = window.pageYOffset || document.documentElement.scrollTop;
        if ((this.keysPressed["ArrowUp"]) || (this.keysPressed["w"])) {
            this.vel.add(this.dir.copy().mul(cfg.acc * delta));
            drawFlame = true;
        }
        else {
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
        function keyPressedAction(id, op) {
            if (my.keysPressed[cfg.keyBind[id]] && nowTime - my.updated.time[id] > cfg.rateLimit[id]) {
                op();
                my.updated.time[id] = nowTime;
            }
        }
        keyPressedAction("fire", function () {
            if (_this.bullets.length + 1 > cfg.maxBullets) {
                return;
            }
            _this.bullets.unshift({
                dir: _this.dir.copy(),
                pos: _this.pos.copy(),
                startVel: _this.vel.copy(),
                cameAlive: nowTime
            });
        });
        keyPressedAction("blink", function () {
            updateEnemies();
            forceChange = true;
            document.body.classList.toggle(cfg.cssBlink);
            _this.updated.time.blink = nowTime;
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
        }
        else if (this.pos.x < 0) {
            window.scrollTo(this.scrollPos.x - 50, this.scrollPos.y);
            this.pos.x = w;
        }
        if (this.pos.y > h) {
            window.scrollTo(this.scrollPos.x, this.scrollPos.y + h * 0.75);
            this.pos.y = 0;
        }
        else if (this.pos.y < 0) {
            window.scrollTo(this.scrollPos.x, this.scrollPos.y - h * 0.75);
            this.pos.y = h;
        }
        for (var i = this.bullets.length - 1; i != -1; i--) {
            var bullet = this.bullets[i];
            if (nowTime - bullet.cameAlive > cfg.bulletAlive) { // Time to live
                this.bullets.splice(i, 1); // require idx
                forceChange = true;
                continue;
            }
            calcMoveForward(bullet, delta);
            var murdered = getElementFromPoint(bullet.pos.x, bullet.pos.y);
            if (murdered && murdered.tagName && !(cfg.ignoredTypes.has(murdered.tagName.toUpperCase())) && hasOnlyTextualChildren(murdered) && murdered.className !== cfg.cssYeah) {
                addParticles(bullet.pos);
                this.dying.push(murdered); // key space
                this.bullets.splice(i, 1);
                continue;
            }
        }
        for (var i = this.dying.length - 1; i != -1; i--) {
            try {
                if (this.dying[i].parentNode)
                    ASTEROIDS.nKill++;
                this.dying[i].parentNode.removeChild(this.dying[i]);
            }
            catch (e) { }
        }
        setScore();
        this.dying = [];
        for (var i = this.particles.length - 1; i != -1; i--) {
            var particle = this.particles[i];
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
            if (drawFlame)
                this.ctx.drawFlames(my.flame);
            if (this.bullets.length) {
                this.ctx.drawBullets(this.bullets);
            }
            if (this.particles.length) {
                this.ctx.drawParticles(this.particles);
            }
        }
        this.lastPos = this.pos;
        try {
            for (var _b = __values(this.updated.ids), _c = _b.next(); !_c.done; _c = _b.next()) {
                var k = _c.value;
                this.updated[k] = false;
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_6) throw e_6.error; }
        }
        next();
    };
    refreshMainloop(this.update.bind(this))();
    function destroy() {
        var e_7, _a;
        try {
            for (var eventCancellers_1 = __values(eventCancellers), eventCancellers_1_1 = eventCancellers_1.next(); !eventCancellers_1_1.done; eventCancellers_1_1 = eventCancellers_1.next()) {
                var op = eventCancellers_1_1.value;
                op();
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (eventCancellers_1_1 && !eventCancellers_1_1.done && (_a = eventCancellers_1["return"])) _a.call(eventCancellers_1);
            }
            finally { if (e_7) throw e_7.error; }
        }
        doms.removeElement(cfg.eidStyles);
        document.body.classList.remove(cfg.cssYeah);
        this.gameContainer.parentNode.removeChild(this.gameContainer);
    }
}
ASTEROIDS.players.push(new Asteroids());
