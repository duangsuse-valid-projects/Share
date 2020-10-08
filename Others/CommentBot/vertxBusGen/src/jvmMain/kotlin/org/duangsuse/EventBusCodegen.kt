package org.duangsuse

import io.fluidsonic.meta.Meta
import java.io.File
import javax.annotation.processing.*
import javax.lang.model.element.Element
import javax.lang.model.element.ExecutableElement
import javax.lang.model.element.TypeElement

abstract class AbstractCodegenProcessor(vararg annotationTypes: String): AbstractProcessor() {
  private val annotationTypeSet = annotationTypes.toMutableSet()
  abstract fun process(roundEnv: RoundEnvironment, annotations: Set<TypeElement>): Boolean
  override fun getSupportedAnnotationTypes(): MutableSet<String> = annotationTypeSet
  final override fun process(annotations: MutableSet<out TypeElement>?, roundEnv: RoundEnvironment?): Boolean {
    return process(roundEnv!!, annotations!!)
  }
  protected fun outputCode(package_name: String, name: String, code: String) {
    val kotlinGenerated = processingEnv.options[KAPT_KOTLIN_GENERATED] ?: error("Can't find the target directory for generated Kotlin files.")
    File(kotlinGenerated, package_name.replace('.', File.separatorChar)).let { it.mkdirs(); File(it, "$name.kt") }.writeText(code)
  }
  protected inline fun <reified AN: Annotation> RoundEnvironment.getElementsAnnotatedWith(): Set<Element> = getElementsAnnotatedWith(AN::class.java)
  companion object {
    const val changed = true; const val unchanged = false
    const val KAPT_KOTLIN_GENERATED = "kapt.kotlin.generated"
  }
}

annotation class Broadcast
annotation class EventBusEndpoint(val address: String = "")
class EventBusEndpointCodegenProcessor: AbstractCodegenProcessor(EventBusEndpoint::class.qualifiedName!!) {
  override fun process(roundEnv: RoundEnvironment, annotations: Set<TypeElement>): Boolean {
    val broadcastSet = roundEnv.getElementsAnnotatedWith<Broadcast>().filterIsInstance<ExecutableElement>()
      .mapTo(mutableSetOf()) { "${(it.enclosingElement as TypeElement).qualifiedName}" to "${it.simpleName}" }
    println(broadcastSet)
    for (endpoint in roundEnv.getElementsAnnotatedWith<EventBusEndpoint>()) (endpoint as? TypeElement)?.let(::processInterface)
    return changed
  }
  private fun processInterface(interfaceElem: TypeElement) {
    val qualName = "${interfaceElem.qualifiedName}"
    val (packageName, name) = interfaceElem.packageSimpleNamePair()
    val meta = Meta.of(interfaceElem)
    val code = StringBuilder(CODE_ENDPOINT_HEADER)
  }
  private fun TypeElement.packageSimpleNamePair(): Pair<String, String> {
    val simpleName = "$simpleName"
    return simpleName to "$qualifiedName".substring(0, (1/*dot*/+simpleName.length) +1)
  }
}

const val CODE_ENDPOINT_HEADER = """
package %s

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import io.vertx.core.Closeable
import io.vertx.core.Future
import io.vertx.core.Promise
import io.vertx.core.buffer.Buffer
import io.vertx.core.eventbus.DeliveryOptions
import io.vertx.core.eventbus.EventBus
import io.vertx.core.eventbus.MessageCodec
import io.vertx.core.eventbus.MessageConsumer
import space.iseki.annotation.forvertx.EventBusResult
import space.iseki.annotation.forvertx.VertxMessageCodec

"""
const val CODE_ENDPOINT_TEMPLATE = """
-[types]

class -[clientClassName]EBClient(private val eb: EventBus): -[simpleName] {
-[client]
}

class -[serverClassName]EBServer(eb: EventBus, private val impl: -[simpleName]): Closeable {
  private val consumers: MutableSet<MessageConsumer<*>> = mutableSetOf()
  init {
-[server]
  }
  override fun close(completion: Promise<Void>?) {
    for (cm in consumers) {
      cm.unregister().onFailure { completion?.tryFail(it) }
        .onSuccess { consumers.remove(mc); if (consumers.isEmpty()) completion?.tryComplete() }
    }
  }
}
"""
const val CODE_ENDPOINT_FUNCTION_TEMPLATE = """
-{buildString types}
// Request codec
private val -[qclassName]_Codec_class_qname = -[qclassName]_Codec::class.java.name

data class -[qclassName](-[joinValList parameters])
private val -[qclassName]_deliveryOptions: DeliveryOptions = DeliveryOptions().setCodecName(-[qclassName]_Codec_class_qname)

@VertxMessageCodec
class -[qclassName]_Codec(private val mapper: ObjectMapper): MessageCodec<-[qclassName], -[qclassName]> {
  override fun name() = -[qclassName]_Codec_class_qname
  override fun systemCodecID(): Byte = -1
  
  override fun encodeToWire(buffer: Buffer, s: -[qclassName]) {
    val b = mapper.writeValueAsBytes(s)
    buffer.appendInt(b.size).appendBytes(b)
  }
  override fun decodeFromWire(pos: Int, buffer: Buffer): -[qclassName] =
    mapper.readValue(buffer.getBytes(pos + 4, buffer.getInt(pos) + pos), typeRef)
  override fun transform(s: -[qclassName]): -[qclassName] = s

  companion object {
    val typeRef = object : TypeReference<-[qclassName]>() {}
  }
}

-{if !onlySend}
// Response codec
private val -[sclassName]_Codec_class_name = -[sclassName]_Codec::class.java.name
private val -[sclassName]_deliveryOptions = DeliveryOptions().setCodecName(-[sclassName]_Codec_class_name)

@VertxMessageCodec
class -[sclassName]_Codec(private val mapper: ObjectMapper): MessageCodec<EventBusResult<-[rtype]>, EventBusResult<-[rtype]>> {
    override fun name(): String = -[sclassName]_Codec_class_name
    override fun systemCodecID(): Byte = -1

    override fun encodeToWire(buffer: Buffer, s: EventBusResult<-[rtype]>) {
        val b = mapper.writeValueAsBytes(s)
        buffer.appendInt(b.size).appendBytes(b)
    }
    override fun decodeFromWire(pos: Int, buffer: Buffer): EventBusResult<-[rtype]> =
        mapper.readValue(buffer.getBytes(pos + 4, buffer.getInt(pos) + pos), typeRef)

    override fun transform(s: EventBusResult<-[rtype]>) = s

    companion object {
        val typeRef = object : TypeReference<EventBusResult<-[rtype]>>() {}
    }
}
-{end}-{end}

-{if !onlySend}
-{buildString client}
  // Client function with response
  override fun -[fname](-[joinArgList parameters]): Future<-[rtype]> = Future.future { promise ->
      val obj = -[qclassName](-[joinArgNameList parameters])
      eb.request<EventBusResult<-[rtype]>>("-[address]", obj, -[qclassName]_deliveryOptions) {
          if (it.succeeded()) {
              if (it.result().body().ok) {
                  promise.tryComplete(it.result().body().result)
              } else {
                  promise.tryFail(it.result().body().cause)
              }
          } else {
              promise.tryFail(it.cause())
          }
      }
  }
  // Client function without response
  override fun -[fname](-[joinArgList parameters]) {
      eb.-[action]("-[address]", -[qclassName](-[joinArgNameList parameters]), -[qclassName]_deliveryOptions)
  }
-{end}
-{buildString server}
     // Server function with response
     eb.consumer<-[qclassName]>("-[address]") { msg ->
         val body = msg.body()
         impl.-[fname](-[joinArgNameList parameters])
             .onSuccess { msg.reply(EventBusResult(true, it, null), -[sclassName]_deliveryOptions) }
             .onFailure { msg.reply(EventBusResult(false, null, it), -[sclassName]_deliveryOptions) }
     }.let(consumers::add)
      // Server function without response
      eb.consumer<-[qclassName]>("-[address]") {
          val body = it.body()
          impl.-[fname](-[joinArgNameList parameters])
      }
|
-{end}
-{end}
"""