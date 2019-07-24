require 'oop'

--[[
  面向对象继承特性用例
  使用了 prototype-based 继承，覆盖里不能间接引用父类成员
  ]]

animal = inherit.class()
animal.ctor = function(o, id) o.name= id end
function animal:describe()
  print("我是" .. self.name) end

cat = inherit.class(animal)
cat.ctor = function(o, id) o.name= "猫" .. id end

meo = cat.new('喵喵')
meo:describe()

function mk_nameprefix_ctor(pre)
  local function constr(o, name)
    local finame = pre .. name
    o.name = finame
  end
  return constr end

dog = inherit.class(animal)
dog.ctor = mk_nameprefix_ctor("狗")

woof = dog.new("招财")
woof:describe()

coolanimal = inherit.class(animal)
function coolanimal:describe()
  print(self.name .. " 是很酷的！") end

caffe = coolanimal.new("Caffe")
caffe:describe()

function mk_animal(kind, proto)
  if proto ==nil then proto= animal end
  local subtype = inherit.class(proto)
  subtype.ctor = mk_nameprefix_ctor(kind)
  subtype.kind = kind
  return subtype end

pig = mk_animal("猪")
goog = mk_animal("神秘鸽", coolanimal)

pig.new("哼哼"):describe()
goog.new("咕咕"):describe()
