"""Map original authoring coordinates to the approved long-body proportions."""
from mathutils import Vector

def height(z):
    return z*.9/.564 if z<=.564 else .9+(z-.564)*(.8/.291)

def inverse_height(z):
    return z*.564/.9 if z<=.9 else .564+(z-.9)*(.291/.8)

def chibi_point(v,head=False,weapon=False):
    x,y,z=v
    return Vector((x*(2.35 if head else 1.25),y*(2.35 if head else 1.25),
                   1.80525+(z-1.47)*2.15 if head else height(.594)+(z-.99)*1.0 if weapon else height(z*.6)))

def inverse_point(v,head=False):
    return Vector((v.x/(2.35 if head else 1.25),v.y/(2.35 if head else 1.25),
                   (v.z-1.80525)/2.15+1.47 if head else inverse_height(v.z)/.6))
