module('inherit', package.seeall)
vtables = {}
noctor = function(_) end

--[[
 prototype based object-oriented subclass inherance
   author: duangsuse
   date: Jul 2019
]]

-- Hook class object member creation __newindex
function hook_member_creation(kls)
  local function mkmember(klz, name,value)
    rawset(klz, name,value)
    if vtables[klz] ==nil then vtables[klz] = {} end
    vtables[klz] [name] = value
  end -- define reflect vtable

  setmetatable(kls, {__newindex=mkmember})
end

-- Hook superclass member lookup for vtable
function hook_super_lookup(vtbl, kls)
  local function getmember(tbl, name)
    local found = vtables[kls.super] [name]
    tbl[name] = found
    return found
  end
  if kls.super ~=nil then
    setmetatable(vtbl, {__index=getmember}) end  
end

-- Is this constructor needs to call?
function need_ctorcall(ctor)
  return ctor ~=nil and ctor ~=noctor
end

-- Construct a new class instance by call its family constructors recursively
function construct(ths, inst, ...)
  if ths ==nil then return end
  local ctor = ths.ctor
  construct(ths.super, inst, ...)
  if need_ctorcall(ctor) then ctor(inst, ...) end
end

function mk_lookup(tbl)
  local function lookup(_, name)
    return tbl[name] end
  return lookup
end

function hook_vtable_lookup(o,k)
  setmetatable(o, {__index=mk_lookup(vtables[k])})
end

-- ENTRY
-- Creates class metaobject instance, using super as baseclass, ctor default to none
-- Examples
-- require 'oop'
-- animal = inherit.class()
-- animal.ctor = function(o, id) o.name= id end
-- function animal:describe() print("我叫" .. self.name) end
-- cat = inherit.class(animal)
-- cat.ctor = function(o, id) o.name= "猫" .. id end
-- meo = cat.new('喵喵')
-- meo:describe()
function class(super)
  local klass = {}
  klass.super = super
  klass.ctor = noctor

  local vtable = {}; vtables[klass] = vtable
  hook_member_creation(klass)
  hook_super_lookup(vtable, klass)

  klass.new = function(...)
    local object = {}
    construct(klass, object, ...)
    hook_vtable_lookup(object,klass)
    return object
  end

  return klass
end
