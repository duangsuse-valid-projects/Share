import bpy
import bpy.utils as U
C=bpy.context; D=bpy.data
import functools as Ft

def each(a,f):
  for x in a:f(x)
def also(x,f):f(x);return x
apart1=lambda f:lambda *a,**kw:lambda x1:f(*a,x1,**kw)

class blui: # UI Tree
  _kt=dict(fmt="label",op="operator",col="column", # ui.fmt(..)(x)=x.label(..)
    sep="separator", menu_sub="operator_menu_enum",menu_icon="operator_enum")
  kFmt=lambda k: " ".join(x.capitalize()for x in k.split("_")[1:])or k
  of=lambda o:vagetr(lambda k:ui.prop(of=[o,k]), _propDefOn(o) ) # blui.of(x).k=ui.prop(x,"k")
  def __call__(o, ui,a):
    for x in a: (ui.operator(x[1:]) if x[0]=='!' else ui.label(text=x)) if isinstance(x,str) else (o.row(*x)if isinstance(x,list) else x)(ui)
    return ui
  def __getattribute__(o,k):
    def iced(*a, of=[],**kw):return lambda e0: o(getattr(e0,blui._kt.get(k,k)) (*of,**kw), a) #^11
    return iced
  @staticmethod
  def popup(k="props_dialog",w=300):f=getattr(bpy.types.WindowManager,"invoke_"+k);return (lambda o,c,ev:f(o,ev) )if k in{"props_popup","confirm"} else lambda o,c,ev:f(o,width=w)
  do_part=lambda k:vaset(operator_context=k)
class _genUI:
  def __init__(o,ui,f): o.obj=ui; f(o)
  def __call__(o,*a): ui(o.obj.layout,a)
ui=blui(); plug=[]
def register():each(plug,U.register_class)
def unregister():each(plug,U.unregister_class)

@apart1 #Menu,Panel, Op(btn)
def bl(name,k,f, kUI="PROPERTIES WINDOW", finer=None,invoker=None,add=None, mixin=object):
  class _ (mixin):
    bl_label = name;bl_idname = k
    def draw(o,ctxt_global):_genUI(o,f)
    if finer:
      def unregister(o):finer(o)
  if -1!= (i:=k.find("_MT_")):
    class A(_,bpy.types.Menu): show=blui.op("wm.call_menu_pie"if k.startswith("PIE",i+4) else"wm.call_menu", name=k)
  elif 1!=len( (i:=k.rsplit(".",1))):
    class A(bpy.types.Operator):
      bl_label = name;bl_idname = i[0]; op=blui.op(i[0])
      bl_description=i[1]
      __annotations__={k:_pTy(k,*v) for k,v in f.__annotations__.items()}
      def execute(o,ctxt_overriden):f(o, *[getattr(o,k)for k in o.__annotations__.keys()] ); return{'FINISHED'}
      if invoker:invoke=invoker
      if finer: poll=classmethod(finer)
      if add:
        def _insUI(T,f=ui.op(i[0])):
          f=lambda o,c:_genUI(o,f); T.append(f); return lambda:T.remove(f)
        unregister=_insUI(*add)
  else:
    i=k.index("_PT_"); k0,k1=kUI.split()
    class A(_,bpy.types.Panel):
      bl_region_type = k1
      bl_space_type = k0; bl_context = k[:i].lower(); bl_category = k[:i] #OBJECT_PT_x
  plug.append(A) if name else 0;return A

def _deflCaller(k,**kw): # f=blui.op("wm.menu");  f(arg=):do, f(text=,):UI
  def do(arg=None,**e):
    return Ft.reduce(getattr,k.split('.'), bpy.ops)(**kw,**arg or{})if( arg!=None and not e) else ui.op(vaset(**kw,**arg or{}),of=[k],**e)
  return do
blui.op=_deflCaller # @bl Op-prop helpers
@apart1
def _propDefOn(o,kv): k,arg=kv; setattr(getattr(bpy.types,o.bl_rna.identifier), k, _pTy(k,*arg))

vaset=lambda **kw:lambda o: each(kw.items(),lambda x: setattr(o,*x))
def vagetr(f,fw):
  class D:
    def __getattribute__(o,k):return f(k)
    def __setattr__(o,k,v):fw((k,v))
  return D()

_Ty={T:getattr(bpy.props,f"{v if v else T.__name__.capitalize()}Property")
  for T,v in {set:"Enum",list:"Collection",str:"String",object:"Pointer", bool:0,int:0,float:0}.items()}
def _pTy(k, t,tt="",s="",v0=None,kr={}):
  if not tt:tt="NONE"
  if tt=="+":tt="UNSIGNED";kr=dict(min=0)
  if tt=="%":tt="PERCENTAGE";kr=dict(min=0,max=1)
  if isinstance(kr,tuple): kr=dict(min=kr[0],max=kr[0])
  kw={"description":s, "items" if t==set else "default" if t==bool else "type" if t==object or t==list else "subtype":tt}
  if None!=v0:kw["default"]=v0
  return _Ty.get(t,t)(name=kr.pop("name","")or blui.kFmt(k),**kw,**kr) #ui.prop(text=)


# samples @prop editor: red^1,yellow icon
@bl("Hello World Panel","OBJECT_PT_hello")
def a(lay, br=ui.row()):
  it=C.object
  lay(br,
  ui.fmt(text="Hello world!", icon='WORLD_DATA'), br,
  "Active object is: " + it.name, br,
  ui.prop(of=[it,"name"]), br,
  "!mesh.primitive_cube_add")

@bl("Hello wo", "OBJECT_PT_helo")
def a(lay):
  S=blui.of(C.scene)
  lay(["Just","!wm.open_mainfile", "!render.render"], S.frame_current, S.frame_end)

@bl("Simple Object Operator","object.simple_operator. Tooltip", finer=lambda T,c:c.active_object!=None, add=[bpy.types.VIEW3D_MT_object])
def SimpleOperator(op):
  for ob in C.scene.objects:print(ob)
  op.report({"INFO"},"good")

@bl("","VIEW3D_MT_uv_map") # Menus
def mUvMap():pass

@bl("My Menu", "OBJECT_MT_helo")
def myMenu(lay):
  lay(
  "!wm.open_mainfile",
  "!wm.save_as_mainfile",
  "!object.shade_smooth",
  ui.fmt(text="Hello world!", icon='WORLD_DATA'),
  ui.menu_sub(of=["object.select_by_type"],property="type", text="all Type"),
  mUvMap.show(text="Unwrap"), mUvMap.show() ) # code reuse!

@bl("Select Mode","VIEW3D_MT_PIE_template")
def myPie(lay):
  lay( ui.menu_pie(ui.menu_icon(of=["mesh.select_mode","type"])) )


@bl("Show Pie", "my.menu_pie. Display float ui")
def pie(op): myPie.show(arg={})

@bl("Layout Demo","SCENE_PT_demo")
def a(lay):
  S=blui.of(C.scene); uis=[S.frame_start,S.frame_end];ren="!render.render"
  lay(
  " Simple Row:",uis,
  " Aligned Row:",ui.row(*uis,align=True),
  ui.split(
    ui.col("Column One:", *uis),
    ui.col("Column Two:", *uis, align=True)
  ),
  "Big Button:",
  [vaset(scale_y = 3.0), ren],
  "Different button sizes:",
  ui.row(ren, [vaset(scale_x = 2.0),ren] ,ren, align=True),
  [myPie.show(text="Pie"),myMenu.show(text="M"), pie.op() ] )

import bpy.utils.previews as UP
# dynamic icon(>= custom icon)
previewers={"main":also(UP.new(), vaset(my_previews_dir = "",my_previews = ()))}
def filterImg(fp,po):
  import os
  if fp == po.my_previews_dir: return po.my_previews

  print("Scanning directory: %s" %fp); res=[]
  if fp and os.path.exists(fp):
    # Scan the directory for png files
    fps = [x for x in os.listdir(fp) if x.lower().endswith(".png")]
    for i, name in enumerate(fps):
      icon = po.get(name)or po.load(name, os.path.join(fp, name), 'IMAGE') #don't use both get()&has()
      res.append((name, name, "", icon.icon_id, i))

  po.my_previews_dir = fp; po.my_previews = res #^fn:L2
  return res

wm=C.window_manager
W=blui.of(wm)
@bl("Previews Example Panel","OBJECT_PT_previews", finer=lambda: each(previewers.values(), UP.remove))
def a(lay):
  lay( W.my_previews_dir, ui.template_icon_view(of=[wm,"my_previews"]), W.my_previews)

W.my_previews_dir=(str,'DIR_PATH', "Folder Path")
W.my_previews=(set,lambda o,c:filterImg(wm.my_previews_dir,previewers["main"]) if o!=None else [])


@bl("Refresh","sequencerextra.refresh_font_data.", invoker=blui.popup())
def fresh(op, n:(int,"+", "count", 1) ): [myPie.show(arg={}) for i in range(n)]

@bl("Subsimport","Tool_PT_subsimport", kUI="SEQUENCE_EDITOR UI")
def a(lay):
  lay(
  [S.subtitle_edit_channel],
  ui.box(
    [S.subtitle_font],
    [S.subtitle_font_size],
    [S.subtitle_font_height], #v operator args UI
    [fresh.op(icon="FILE_REFRESH", arg=dict(n=3)), fresh.op(), [blui.do_part("EXEC_DEFAULT"), fresh.op()] ],
    ui.box(
      [S.use_dictionary_syllabification],
      [S.use_algorithmic_syllabification, S.syllabification_language ],
      [pie.op(icon="ALIGN_FLUSH"), pie.op(icon="DISK_DRIVE") ],
      [S.syllable_dictionary_path]
    )
  ))

S=blui.of(C.scene)
S.subtitle_edit_channel = (int,"+","The channel where keyboard shortcuts will act on text strips",1)
S.subtitle_font = (str,"FILE_PATH","The font of the added text strips after import")
S.subtitle_font_size = (int,"PIXEL","The font size of the added text strips after import",70)
S.subtitle_font_height = (float,"%","The height of the added text strips after import")
S.syllable_dictionary_path = (str,"FILE_PATH","Path to the text file containing words separated by syllables.\nNeeded for accurate splitting of subtitles by syllable.")
S.enhanced_subs_color = (bpy.props.FloatVectorProperty,'COLOR_GAMMA',
    "Highlight color of the subtitles in the edit channel",(1.0, 0.5, 0.0),
    dict(size=3,min=0.0, max=1.0,))
S.use_dictionary_syllabification = (bool,True,"Use (Less-Error-Prone) algorithm to syllabify words.")
S.use_algorithmic_syllabification = (bool,True,"Use (imperfect) algorithm to syllabify words.\nIf dictionary method is enabled, the algorithm is used for words not found in the dictionary.",True, dict(name="Algorithm"))

S.syllabification_language = (set,[('en-us', 'English-U.S.', ''),('ru', 'Russian', ''),],"Set the language to use when syllabifying","en-us")
S.subtitle_combine_mode = (set,[
    ('esrt', 'ESRT', 'Combine subtitles as enhanced SRT strips'),
    ('elrc', 'ELRC', 'Combine subtitles as enhanced LRC strips')
],"How to combine the subtitles","esrt")

register()

@bl("a Pan","OBJECT_PT_ap")
def a(lay): lay(
  ui.prop(of=[D.texts[0].current_line,"body"], icon="TEXT"),
  blui.of(D.texts[0]).filepath
)
#[*bpy.context.view_layer.objects.bl_rna.properties]; bpy.msgbus.subscribe_rna(key = bpy.context.scene.render.path_resolve("engine",False),owner = 1,  args = (),notify = lambda:print(1) )
#bpy.app.timers.register( lambda:setattr(bpy,"ed",C.area),first_interval=1) #can't

#C.screen.areas[4].spaces[0]; g=C.scene.sequence_editor.path_resolve("sequences_all",False) #|all.select
#bpy.msgbus.subscribe_rna(key=g , owner=1,args=(), notify=lambda:print(2)); g.update()

#0. We need find out what prop edited
#1. Context scene,VidoEditor won't notify .select change
#2. can't do timer workaround, to save old vals

import json
Sc=C.scene;S=blui.of(Sc); _se=[]
@bl("Bulk modify","OBJECT_PT_ap")
def a(lay): lay(
  [bulkSet.op(icon="FILE_REFRESH",text=f"{len(_se)}x"), uniq.op(), dumpSet.op(icon="HIDE_OFF")],
  S.bulk_json,
  [ui.box(ui.row(ui.fmt(icon="LINCURVE"),ef(3), ef(1), ef(2) ,align=True)), movSeqs.op(icon="ANIM_DATA") ],
  S.bulk_pyalign,
  S.bulk_dur
)
ef=lambda k: fade.op(text=f"{k}",arg=dict(at=k,dt=Sc.bulk_dur))
S.bulk_json=(str,"", "JSON movclip data")
S.bulk_pyalign=(str,"", "Code(a,b) to set a.frame_start", "vaset(frame_start=b.frame_start)(a)")
S.bulk_dur=(int,"TIME", "msec to fade", 1500)
@bl("x", "bulk.select.Bulk prop set")
def bulkSet(op):
  _se=C.selected_sequences
  Sc.bulk_json=""

@bl("Uniq", "bulk.uniq.Unique(swap) text values")
def uniq(op):
  v1=letnul(Sc.bulk_json,load)or odiff(1, objy(C.active_editable_sequence), _sc)
  Sc.bulk_json=dump(v1)
  for a,b in zip(_se, v1): objy(a,b)

@bl("JSON", "bulk.json.Dump/load values")
def dumpSet(op):
  v0=dump(map(objy,_se))
  v1=load(Sc.bulk_json)
  for a,b in zip(_se, v1): objy(a,b)
  Sc.bulk_json=v0

@bl("Align", "bulk.movseq.Align clips with set")
def movSeqs(op):
  for a,b in zip(C.selected_sequences, _se): eval(S.bulk_pyalign)

@bl("Fader", "bulk.fade.Insert fade in/out keyframes")
def fade(op, at:(int,"+", "in|out|inout"), dt:(int,"TIME") ):
  _se

register()
