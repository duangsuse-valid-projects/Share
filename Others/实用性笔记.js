此文件非 JS source ，只是复用高亮

https://ikirby.me/133.html Kt/coro Android 最小封装法
此文笔者最开始用 Thread 和自写 runOnUiThread 去写异步逻辑，但太混乱就用 RxJava ，它虽好点也不易懂、易炸，就全换了 Kotlin Coroutines

gav(org.jetbrains.kotlinx:kotlinx-coroutines-android:1.1.0) 提供了 Dispatchers.Main 在 UI 更新线程上调度

open class BaseAct:Activity,CoroutineScope{
  private val job=SupervisorJob()
  val coroCtx get()=Dispatchers.Main+ job
  fun onDestroy==coroCtx.cancelChildren
  fun examp1=launch { res=withContext(Disp.IO){/*http操作等*/} /*普通UI操作*/}
}

https://xecades.xyz/lab/Cube/
原来 console log warn 啥的支持 `'<css="">'` 啊，百度知乎的招聘 ASCII ART/UI 都弱爆了


https://xecades.xyz/js/script.js
果然是单页 pushState-JAX 应用…… 切换的那么丝滑


[研究性学习 - 简单分形几何图形的性质及作法研究 | Xecades](https://blog.xecades.xyz/articles/fractal/)
[关于 Base64 编码的娱乐性代码 (笑) | Xecades](https://blog.xecades.xyz/articles/base64/)
[康威生命游戏 | 元胞自动机 | Xecades](https://blog.xecades.xyz/articles/LifeGame/)
