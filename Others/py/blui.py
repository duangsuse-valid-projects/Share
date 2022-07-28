
import bpy
import bpy.utils as U

def each(a,f):
  for x in a:f(x)
agive=lambda *a:lambda f:f(*a)
apart1=lambda f:lambda *a:lambda x1:f(*a,x1)
vaset=lambda **kw:lambda o: each(kw.items(),lambda x: setattr(o,*x))

class _ui:
    def __call__(o, pan,*a):
        ui=pan.layout; tag="row"
        for x in a:
            if isinstance(x,str): tag=x;continue
            if tag: ui=getattr(o,tag)() (ui)
            x(ui)
    kt=dict(l="label",r="row",op="operator") # ui.r(..)(x)=x.row(..)
    pOf=lambda o:vagetr(lambda k:ui.prop(o,k))
    def __getattribute__(o,k):
        def aUi(*a,e=[],**kw):
            return lambda e0: (lambda e1: each(e,agive(e1))or e1)(getattr(e0,_ui.kt.get(k,k)) (*a,**kw))
        return aUi
ui=_ui(); plug=[]



@apart1
def blPanel(name,k,f):
  if -1!= (i:=k.find("_MT_")):
    class A(bpy.types.Menu):
      bl_label = name;bl_idname = k
      def draw(o,c):f(o)
      show=lambda:bpy.ops.wm.call_menu(name=k)
  else:
    i=k.index("_PT_")
    class A(bpy.types.Panel):
      bl_label = name;bl_idname = k
      bl_region_type = 'WINDOW'
      bl_space_type = 'PROPERTIES'
      bl_context = k[:i].lower()
      def draw(o,c):f(o,c)
  plug.append(A);return A

def register():each(plug,U.register_class)
def unregister():each(plug,U.unregister_class)


@blPanel("Hello wo", "OBJECT_PT_help")
def lay(o,c):
    ui(o, ui.l(text="fdfd"),ui.op("wm.open_mainfile"))

@blPanel("My Menu", "OBJECT_MT_helo") #Pie
def lay(o):
  ui(o,"",
  ui.op("wm.open_mainfile"),
  ui.op("wm.save_as_mainfile"),
  ui.op("object.shade_smooth"),
  ui.l(text="Hello world!", icon='WORLD_DATA'),
  ui.operator_menu_enum("object.select_by_type",property="type", text="Select All by Type"),
  ui.op("wm.call_menu", text="Unwrap", e=[vaset(name = "VIEW3D_MT_uv_map")] ))

@blPanel("Layout Demo","SCENE_PT_demo")
def lay(o,c):
  S=_ui.pOf(c.scene); uis=[S.frame_start,S.frame_end];ren=ui.op("render.render")
  ui(o,"",
  " Simple Row:",
  ui.r(e=[S.frame_start,S.frame_end]),
  " Aligned Row:",
  ui.r(align=True,e=uis),
  ui.split(e=[
    ui.col(e=["Column One:", *uis])
    ui.col(align=True,e=["Column Two:", *uis])
  ]),
  "Big Button:",
  ui.r(e=[ren, vaset(scale_y = 3.0)]),
  "Different button sizes:",
  ui.r(align=True,e=[ren, ui.r(e=[ren,vaset(scale_x = 2.0)]) ,ren]) )


if __name__ == "__main__":
    register()
    lay.show()


def each(a,f): #JSON xml-able
  for x in a:f(x)
agive=lambda *a:lambda f:f(*a)
class _ui:
  kt=dict(r="row",l="label",op="operator")
  def __call__(o, bui,*a):
    for x in a: o._mk(x, bui.layout.row())
  def _mk(o, x,r):
    k,sub=x[0]
    f=getattr(r, _ui.kt.get(k)or k)
    if isList(x): r=f(*x[1:])
    else: del x[0]; r=f(**x)
    each(sub, lambda it:o._mk(it,r))
  def __getattribute__(o,k):
      return lambda *a,**kw: _2parts(a,isList,lambda k: [k,*a] if kw=={} else {0:k,**kw} )
ui=_ui(); plug=[]

def defPanel(k,id,f):
    i=id.index("_PT_")
    class Inf(bpy.types.Panel):
        bl_label = k;bl_idname = id
        bl_region_type = 'WINDOW'
        bl_space_type = 'PROPERTIES'
        bl_context = "object"
        def draw(o,c):f(o,c)
    plug.append(Inf)

def register():each(plug,U.register_class)
def unregister():each(plug,U.unregister_class)
if __name__ == "__main__":register()


import bpy
import bpy.utils as U

def each(a,f):
  for x in a:f(x)
apart1=lambda f:lambda *a:lambda x1:f(*a,x1)
vaset=lambda **kw:lambda o: each(kw.items(),lambda x: setattr(o,*x))
def vagetr(f):
  class D:
    def __getattribute__(o,k):return f(k)
  return D()

class _ui:
  kt=dict(l="label",r="row",op="operator",col="column",menus="operator_menu_enum") # ui.r(..)(x)=x.row(..)
  pOf=lambda o:vagetr(lambda k:ui.prop(o,k)) # _ui.pOf(x).k=ui.prop(x,"k")
  def __call__(o, ui,*a,box=""):
    for x in a:
      if (q:= isinstance(x,str))and hasattr(ui,x): box=x;continue #bad
      if box: getattr(o,box)() (ui)
      o.l(text=x)(ui) if q else x(ui)
    return ui
  def __getattribute__(o,k):
      def aUi(*a,e=[],**kw):
          return lambda e0: o(getattr(e0,_ui.kt.get(k,k)) (*a,**kw), *e)
      return aUi
ui=_ui(); plug=[]
def register():each(plug,U.register_class)
def unregister():each(plug,U.unregister_class)

@apart1
def blPanel(name,k,f):
  class _:
    bl_label = name;bl_idname = k
    def draw(o,c):f(o.layout,c)
  if -1!= (i:=k.find("_MT_")):
    class A(_,bpy.types.Menu): show=lambda:bpy.ops.wm.call_menu(name=k)
  else:
    i=k.index("_PT_")
    class A(_,bpy.types.Panel):
      bl_region_type = 'WINDOW';bl_space_type = 'PROPERTIES'
      bl_context = k[:i].lower()
  plug.append(A);return A

@blPanel("Hello World Panel","OBJECT_PT_hello")
def lay(o,c):
  it=c.object
  ui(o,"row",
  ui.l(text="Hello world!", icon='WORLD_DATA'),
  "Active object is: " + it.name,
  ui.prop(it,"name"),
  ui.op("mesh.primitive_cube_add"))

@blPanel("Hello wo", "OBJECT_PT_helo")
def lay(o,c):
    S=_ui.pOf(c.scene)
    ui(o,"row", "fdfd",ui.op("wm.open_mainfile"), ui.op("render.render"), S.frame_current )

@blPanel("My Menu", "OBJECT_MT_helo")
def myMenu(o,c):
  ui(o,
  ui.op("wm.open_mainfile"),
  ui.op("wm.save_as_mainfile"),
  ui.op("object.shade_smooth"),
  ui.l(text="Hello world!", icon='WORLD_DATA'),
  ui.menus("object.select_by_type",property="type", text="all Type"),
  ui.op("wm.call_menu", text="Unwrap", e=[vaset(name = "VIEW3D_MT_uv_map")] ))

@blPanel("Layout Demo","SCENE_PT_demo")
def lay(o,c):
  S=_ui.pOf(c.scene); uis=[S.frame_start,S.frame_end];ren=ui.op("render.render")
  ui(o,
  " Simple Row:",ui.r(e=uis),
  " Aligned Row:",ui.r(align=True,e=uis),
  ui.split(e=[
    ui.col(e=["Column One:", *uis]),
    ui.col(align=True,e=["Column Two:", *uis])
  ]),
  "Big Button:",
  ui.r(e=[ren, vaset(scale_y = 3.0)]),
  "Different button sizes:",
  ui.r(align=True,e=[ren, ui.r(e=[ren,vaset(scale_x = 2.0)]) ,ren]) )

register()
myMenu.show()

def _deflCaller(k,**kw): # f=blui.op("wm.menu");  f(arg=):do, f(text=,):UI
  def do(arg=None,do_part=None,**e):
    return F.reduce(getattr,k.split('.'), bpy.ops)(do_part or "EXEC_DEFAULT",**kw,**arg or{})if( arg!=None and not e)  \
       else nulWrap(ui.op(k,e=[vaset(**kw,**arg or{})],**e), do_part, lambda op,k: [vaset(operator_context=k),op])
  return do
nulWrap=lambda x,o,f:x if o==None else f(x,o)
