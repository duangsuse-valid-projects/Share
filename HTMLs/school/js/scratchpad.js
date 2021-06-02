/*
 * 这是一张 JavaScript 代码草稿纸。
 *
 * 输入一些 JavaScript，然后可点击右键或从“执行”菜单中选择：
 * 1. 运行 对选中的文本求值(eval) (Ctrl+R)；
 * 2. 查看 对返回值使用对象查看器 (Ctrl+I)；
 * 3. 显示 在选中内容后面以注释的形式插入返回的结果。 (Ctrl+L)
 */
const
	name = f => f.displayName || f.name,
	arity = f => f.arity || f.length,
	derived = (f, f_origin) => {
		f.name = name(f_origin);
		f.arity = arity(f_origin);
		return f
	},
	invoke = (f, args, self) => f.apply(self, args);

const /** value itself */
	identity = (x => x), /** stored value */
	constant = k => (_ => k),
	/** Derive of `f` with reversed order of args */
	flip = f => (...args) => invoke(f, args.reverse()),
	/** Lisp-style flatten-last apply: ap(f, 1,[2,3])==f(1,2,3); ap(f, 1)==f(1) */
	apply = (f, ...rest) => f.apply(f, rest.concat(rest.pop())),
	/** Derive of `f` that returns opposite truth value */
	complement = f => derived(f, function(...args) {
		return args.length < arity(f) ? complement(partial(f, ...args)) : !invoke(f, args, this);
	}), /** Implicit currying, will continue until expected arity collected. Don't use this with variadic funcs(pass `...array` instead) */
	curry = (f) => {
		let baseN = arity(f);
		function currier(...params) {
			function curried(...args) {
				if(params) args.unshift(params);
				return(args.length >= baseN) ? invoke(fn, args, this) : currier(args);
			}
			curried.arity = baseN - (params ? params.length : 0);
			return curried;
		}
		return currier;
	}, /** Bind `f` to 1+ appended args, returns func with smaller arity */ 
	partial = (f, ...curried) => {
		return derived(f, function(...args) {
			return invoke(f, curried.concat(args), this)
		}).also(it => {
			it.arity -= curried.length
		})
	}, /** Composite lambdas, each one consumes the res of the follow: `compose(f,g,h)(x) == f(g(h(x)))` */
	compose = (...fs) => function composed(...args) {
		let i = fs.length;
		while(--i != 0) args[0] = invoke(fs[i], args, this); // use a.splice?
		return args[0];
	}, /** Give args and `f` to `wrap`, allow to run code before&after, or decide not to run `f` */
	wraped = (f, wrap) => function wrapper(...args) {
		return derived(f, invoke(wrap, [
			f
		].concat(args), this))
	}, /** Create a `f` version thats called only the first time, repeating call will result the 1st res, useful for initial-ization funcs(can omit boolean flag) */
	once = (f) => { // not EventTarget.once
		let ran = false, res;
		return dervied(f, function(...args) {
			if(!ran) {
				res = invoke(f, args, this);
				ran = true;
			}
			return res;
			//return ran? res : (ran=true,res=invoke(f,args,this)
		})
	}, /** Make `f` cached by its args, useful for heavy (re-)computations, `hash` is used to compute cache key(default `identity`) */
	memoize = (f, hash) => {
		let memo = new WeakMap,
			memo1 = Object.create(null);
		let hasher = hash || identity;
		return derived(f, function(...args) {
			let k = hasher(args),
				type = typeof(k);
			if(k && (type === "object" || type === "function")) {
				if(!memo.has(k)) memo.set(key, invoke(f, args, this));
				return memo.get(key);
			} else {
				if(!(key in memo1)) memo1[key] = f.apply(this, args);
				return memo1[key];
			}
		})
	}, /** Combines lambda "statement"s as sequence appending `this` as 1st arg, returns rightmost call. */
	method = (...fs) => function(...args) {
		args.unshift(this);
		return fs.reduce((_, f) => invoke(f, args, this), void 0)
	}, /** Take `p` as predicate, `conseq` and `alter` as then/else func, `alter` defaults to result undefined */
	when = (p, conseq, alter) => function(...args) {
		return invoke(p, args, this) ? invoke(conseq, args, this) : (alter && invoke(alter, args, this));
	}, /** Take `k` out of target, if not `null`-like. it's curried so just provide key */
	field = curry((k, o) => o == null ? o : o[k]),
	/** expected===actual */
	is = curry((expected, actual) => actual === expected),
	isnt = complement(is),
	isInstance = curry((Type, value) => value instanceof Type),
	/** Use '.' separated string key path to get nested field of target, it's curried, see `field` */
	query = curry((path, target) => {
		const names = path.split(".");
		const count = names.length;
		let index = 0;
		let result = target;
		// Note: Permisive `!=` is intentional.
		while(result != null && index < count) {
			result = result[names[index]];
			index = index + 1;
		}
		return result;
	}), /** Derive of `f` that returns `this */
	chainable = f => derived(f,function(...args) {
		invoke(f,args,this);
		return this;
	});

function requireMod(uLoader, kRequire, us) {
  let {require} = Components.utils.import(`resource://${uLoader}.jsm`,{})[kRequire];
  return us.map(k=> require(k+"/index") )
}

let QR, Encoder;
(()=>{
  let a, test=(su,sp)=>requireMod(su, "devtools", [sp+"qrcode", sp+"qrcode/encoder"]);
  try { let sp="devtools/shared/"; a = test(sp+"Loader", sp); }
  catch(ex) { a = test("gre/modules/devtools/Loader", "devtools/toolkit/");  }
  QR=a[0]; Encoder=a[1].Encoder;
})();

function generateQR(dat, quality="L", nPx=240) {
  let ver = QR.findMinimumVersion(dat, quality);
  let code = new Encoder(ver, quality);
  code.addData(dat); code.make();
  let lCell = Math.max(2, Math.floor(nPx / (code.getModuleCount()+ 4*2) ));
  return code.createImgData(lCell);
}

const asy=(f)=>function callwithCallback(...args){
  return new Promise((res)=>f.apply(this, args.concat(res)))
},
  dataURL2Blob=(u)=>{
    let iSep=u.indexOf(","), b64 = u.slice(iSep+1);
    let a = Uint8Array/*u8 not u32*/.from(atob(b64)/*btoa=b_to.from_ascii(s), such confusing*/, i=>i.charCodeAt(0));
    return new Blob([a], {type: u.slice("data:".length, iSep-";base64".length)})
  },
  withFinalizer=(ctor,fin)=>(o,op)=>{
    let x=ctor(o), res=op(x); fin(x); return res;
  }, withObjectURL=withFinalizer(URL.createObjectURL,URL.revokeObjectURL);

chrome.tabs.onActiveChanged.addListener(async()=> {
let b=await asy(chrome.tabs.captureVisibleTab)(1,{format:"png"}).then(dataURL2Blob);
withObjectURL(b, u=>chrome.downloads.download({url:u, filename: "shot.png"}))
});
