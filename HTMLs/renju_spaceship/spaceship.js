// Rewrite of http://www.websiteasteroids.com
var ASTEROIDS = ASTEROIDS || { nKill: 0, players: [] };
function Asteroids() {
    var maths = {
        radians: function (deg) { return deg * Math.PI / 180; },
        random: function (first, last) { return Math.floor(Math.random() * (last + 1) + first); },
        pick: function (a) { return a[maths.random(0, a.length - 1)]; }
    };
    function addStylesheet(selector, rules) {
        var style = document.createElement("style");
        style.id = "ASTEROIDSYEAHSTYLES";
        try {
            style.innerHTML = selector + "{" + rules + "}";
        }
        catch (e) { // https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet#notes
            style.sheet.addRule(selector, rules);
        }
        document.head.appendChild(style);
    }
    function removeElement(id) { document.getElementById(id).remove(); }
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
    var isIE = window.ActiveXObject;
    function textSet(s, sep) {
        if (sep === void 0) { sep = " "; }
        return new Set(s.split(sep));
    }
    var ASTER = "ASTEROIDS";
    var cfg = {
        ignoredTypes: textSet("HTML HEAD TITLE META BODY SCRIPT STYLE LINK SHAPE LINE GROUP IMAGE STROKE FILL SKEW PATH TEXTPATH"),
        hiddenTypes: textSet("BR HR"),
        cssYeah: ASTER + "YEAH",
        cssEnemy: ASTER + "YEAHENEMY",
        cssBlink: ASTER + "BLINK",
        eidNavi: ASTER + "-NAVIGATION",
        eidPoints: ASTER + "-POINTS",
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
        countLimit: {
            particle: isIE ? 20 : 40,
            maxBullets: isIE ? 10 : 20
        },
        acc: 300,
        maxSpeed: 600,
        rotSpeed: 360,
        bulletSpeed: 700,
        particleSpeed: 400,
        timeBetweenFire: 150,
        timeBetweenBlink: 250,
        bulletRadius: 2,
        maxParticles: isIE ? 20 : 40,
        maxBullets: isIE ? 10 : 20
    };
    var my = this;
    var w, h, wh;
    var wPlayer = 20, hPlayer = 30;
    var playerVerts = [
        [-1 * hPlayer / 2, -1 * wPlayer / 2],
        [-1 * hPlayer / 2, wPlayer / 2],
        [hPlayer / 2, 0]
    ];
    this.flame = { r: [], y: [] };
    addStylesheet("." + cfg.cssBlink + " ." + cfg.cssEnemy, "outline: 2px dotted red;"); // key B
    this.pos = new Vec2(100, 100);
    this.dir = new Vec2(0, 1);
    this.vel = new Vec2(0, 0);
    this.lastPos = this.pos;
    this.keysPressed = {};
    this.updated = {
        enemies: false,
        flame: 0,
        time: { blink: 0, fire: 0 }
    };
    this.scrollPos = new Vec2(0, 0);
    this.bullets = [];
    this.enemies = [];
    this.dying = [];
    this.totalEnemies = 0;
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
                width: w + "px",
                height: h + "px"
            });
    };
    function updateEnemyIndex() {
        for (var _i = 0, _a = my.enemies; _i < _a.length; _i++) {
            var enemy = _a[_i];
            enemy.classList.remove(cfg.cssEnemy);
        }
        var all = document.body.getElementsByTagName("*");
        my.enemies = [];
        for (var i = 0, el = void 0; el = all[i]; i++) {
            if (!(cfg.ignoredTypes.has(el.tagName.toUpperCase())) && el.prefix !== "g_vml_" && hasOnlyTextualChildren(el) && el.className !== cfg.cssYeah && el.offsetHeight > 0) {
                //el.aSize = size(el); //unused
                my.enemies.push(el);
                el.classList.add(cfg.cssEnemy);
                if (!el.aAdded) {
                    el.aAdded = true;
                    my.totalEnemies++;
                }
            }
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
    function applyVisibility(vis) {
        for (var _i = 0, _a = ASTEROIDS.players; _i < _a.length; _i++) {
            var p = _a[_i];
            p.gameContainer.style.visibility = vis;
        }
    }
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
            switch (ev.key) {
                case " ":
                    my.updated.time.fire = 1;
                    break;
            }
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
        applyVisibility("hidden");
        var element = document.elementFromPoint(x, y);
        if (!element) {
            applyVisibility("visible");
            return false;
        }
        if (element.nodeType === 3)
            element = element.parentElement;
        applyVisibility("visible");
        return element;
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
    this.gameContainer = document.createElement("div");
    this.gameContainer.className = cfg.cssYeah;
    document.body.appendChild(this.gameContainer);
    this.canvas = document.createElement("canvas");
    this.canvas.className = cfg.cssYeah;
    canvasResize(null);
    Object.assign(this.canvas.style, {
        position: "fixed",
        top: "0px",
        left: "0px",
        bottom: "0px",
        right: "0px",
        zIndex: "10000"
    });
    this.canvas.addEventListener("mousedown", function (ev) {
        var message = document.createElement("span");
        message.style.position = "absolute";
        message.style.color = "red";
        message.innerHTML = "Press Esc to Quit";
        document.body.appendChild(message);
        var x = ev.pageX || (ev.clientX + document.documentElement.scrollLeft);
        var y = ev.pageY || (ev.clientY + document.documentElement.scrollTop);
        message.style.left = x - message.offsetWidth / 2 + "px";
        message.style.top = y - message.offsetHeight / 2 + "px";
        setTimeout(function () {
            try {
                message.parentNode.removeChild(message);
            }
            catch (e) { }
        }, 1000);
    }, false);
    this.gameContainer.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.ctx.fillStyle = "black";
    this.ctx.strokeStyle = "black";
    if (!document.getElementById(cfg.eidNavi)) { // game right-corner
        this.navigation = document.createElement("div");
        this.navigation.id = cfg.eidNavi;
        this.navigation.className = cfg.cssYeah;
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
        this.points.id = cfg.eidPoints;
        this.points.style.font = "28pt Arial, sans-serif";
        this.points.style.fontWeight = "bold";
        this.points.className = cfg.cssYeah;
        this.navigation.appendChild(this.points);
    }
    else {
        this.navigation = document.getElementById(cfg.eidNavi);
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
    this.update = function (nowTime, delta, next) {
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
        if (this.keysPressed[" "] && nowTime - this.updated.time.fire > cfg.timeBetweenFire) {
            this.bullets.unshift({
                dir: this.dir.copy(),
                pos: this.pos.copy(),
                startVel: this.vel.copy(),
                cameAlive: nowTime
            });
            this.updated.time.fire = nowTime;
            if (this.bullets.length > cfg.maxBullets) {
                this.bullets.pop();
            }
        }
        if (this.keysPressed["b"]) {
            if (!this.updated.enemies) {
                updateEnemyIndex();
                this.updated.enemies = true;
            }
            forceChange = true;
            if (nowTime - this.updated.time.blink > cfg.timeBetweenBlink) {
                document.body.classList.toggle(cfg.cssBlink);
                this.updated.time.blink = nowTime;
            }
        }
        else {
            this.updated.enemies = false;
        }
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
        for (var i = this.bullets.length - 1; i >= 0; i--) {
            if (nowTime - this.bullets[i].cameAlive > 2000) {
                this.bullets.splice(i, 1);
                forceChange = true;
                continue;
            }
            var bulletVel = this.bullets[i].dir.copy();
            bulletVel.setDistance(cfg.bulletSpeed * delta);
            bulletVel.add(this.bullets[i].startVel.copy().mul(delta));
            this.bullets[i].pos.add(bulletVel).cycleInBounds(wh);
            var murdered = getElementFromPoint(this.bullets[i].pos.x, this.bullets[i].pos.y);
            if (murdered && murdered.tagName && !(cfg.ignoredTypes.has(murdered.tagName.toUpperCase())) && hasOnlyTextualChildren(murdered) && murdered.className !== cfg.cssYeah) {
                addParticles(this.bullets[i].pos);
                this.dying.push(murdered); // key space
                this.bullets.splice(i, 1);
                continue;
            }
        }
        if (this.dying.length) {
            for (var i = this.dying.length - 1; i >= 0; i--) {
                try {
                    if (this.dying[i].parentNode)
                        ASTEROIDS.nKill++;
                    this.dying[i].parentNode.removeChild(this.dying[i]);
                }
                catch (e) { }
            }
            setScore();
            this.dying = [];
        }
        for (var i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].pos.add(this.particles[i].dir.copy().mul(cfg.particleSpeed * delta * Math.random()));
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
        next();
    };
    refreshMainloop(this.update.bind(this))();
    function destroy() {
        for (var _i = 0, eventCancellers_1 = eventCancellers; _i < eventCancellers_1.length; _i++) {
            var op = eventCancellers_1[_i];
            op();
        }
        removeElement("ASTEROIDSYEAHSTYLES");
        document.body.classList.remove(cfg.cssYeah);
        this.gameContainer.parentNode.removeChild(this.gameContainer);
    }
}
ASTEROIDS.players.push(new Asteroids());
