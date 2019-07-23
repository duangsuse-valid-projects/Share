import java.lang.reflect.*;

import java.util.*;
import java.util.function.*;

public final class Traceback {
  private static class Ref<T> {
    private T object;
    public Ref(T o) { object= o; }
    public T get() {return object;}
    public T set(T newValue) { return (object = newValue); }
  }
		private static final class $ {
				static <T> LinkedList<T> linked()
						{return new LinkedList<T>();}
				static <T> LinkedList<T> linked(final T[] xs) {
						LinkedList<T> result = linked();
						for (T x : xs) result.add(x);
						return result; }

    // 有生之年写过最垃圾的代码 ，已经放弃重构，垃圾 Jawa 不支持泛型类型的数组，可是 Array<List<T>> 就可以
   static void impossible() throws RuntimeException { throw new RuntimeException("Inconsistent program state reached"); }
    // 亲爱的 Java 酱，你自己不 check 怎么能够怪我 unchecked 呢？List<List<T>> 和 List<T>[] 有什么区别...
    // 就是我想运行时 Class.cast Check，也拿不到 Class<List<T>[]> （擦除后是 Class<List[]>）啊，只要泛型检查不支持，擦除里你就看不见 T 是啥子了...
				@SuppressWarnings("unchecked") static <T> List<T>[] partitionWhile(final List<T> xs, Predicate<T> p, Class<T> reifiedT) {
					 final List<T> ls = linked(), rs = linked();
     boolean musttake = false; //state1

    // 没有真泛型真是跟吃了 *　一样的难受；标准库没有 Pair 真是...
						for(T x : xs) { boolean drop = p.test(x); // extermely inefficent
							 if (!musttake && drop) { ls.add(x); } // state0 <- drop = drop
        else if (!musttake && !drop) { musttake= true; rs.add(x); } // state0 <- take => state1
							   else if (musttake) rs.add(x); // state1 <- drop/take = take
        else if (!drop) rs.add(x); // state* <- take = take
      else impossible();
    } List<?>[] result = {ls,rs}; // 贫瘠的 Java，泛型的数组就不支持
      // new ParameterizedType() {
      //  public Type getRawType() {return List.class;} public Type getOwnerType(){return null;}
      //  public Type[] getActualTypeArguments() {return new Type[]{reifiedT};} }

      Object dyn = Array.newInstance(ls.getClass(), 2);
      List<T>[] res = (List<T>[]) dyn.getClass().cast(dyn);
      res[0] = ls; res[1] = rs;
						return res; }

				static <T> List<T> filter(final List<T> xs, Predicate<T> p) {
						List<T> rs = linked();
						for(T x : xs)
							 if (p.test(x)) rs.add(x);
						return rs; } 

   @SuppressWarnings("unchecked") static <T> List<T> dropWhile(final List<T> xs, Predicate<T> p)
     {return partitionWhile(xs, p, (Class<T>)xs.get(0).getClass())[1];}

				@SuppressWarnings("unchecked") static <T> List<T> takeWhile(final List<T> xs, Predicate<T> p)
						{return (List<T>)partitionWhile(xs, p, (Class<T>)xs.get(0).getClass())[0];}

				static <T,R> List<R> map(final List<T> xs, Function<T, R> f) {
						List<R> ys = linked();
						for(T x : xs) ys.add(f.apply(x));
     return ys; }
    static <A, B> List<B> flatMap(final List<A> xs, Function<A, Collection<? extends B>> f) {
						List<B> ys = linked();
						for(A x : xs) ys.addAll((Collection<? extends B>) f.apply(x));
     return ys; }
 	}

		private static List<StackTraceElement> currentTraceback() {
				StackTraceElement[] elems = Thread.currentThread().getStackTrace();
				return $.linked(elems); }
		static List<StackTraceElement> tracebackCutTop()
				{return $.dropWhile(currentTraceback(), (e) -> e.getMethodName().contains("race"));} // takeWhile (/= "tracebackCutTop")
		static List<StackTraceElement> tracebackCutAll(final String bottomName)
				{return $.takeWhile(tracebackCutTop(), (e) -> ! e.getMethodName().equals(bottomName));}
  static List<String> tracefmt(String base) {
    Ref<String> lastclassname = new Ref<>("");
    return $.map(tracebackCutAll(base), (e) -> {
      final String filename = e.getFileName();
      return e.getMethodName() + "::"
        + (lastclassname.get().equals((lastclassname.set(e.getClassName())))? "↑":lastclassname.get())
        + (e.isNativeMethod()? " (native) ":"")
        + (filename.equals(e.getClassName()+".java")?"← ":" @"+ filename + ":")
        + e.getLineNumber(); }); }

  private static void test() { System.out.println("TraceFmt:");System.out.println(tracefmt("main")); test2(); }
  private static void test2() { System.out.println(tracefmt("main")); }
  public static void main(String... args) {
    tracebackCutTop().forEach((e) -> System.out.println(e.getMethodName())	); test();	
  }
}