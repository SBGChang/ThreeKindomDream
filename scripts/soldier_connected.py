"""Weld the clothed anatomical core; keep equipment separate and preserve painted UV regions."""
import bpy, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
from soldier_proportions import inverse_point

def connect_body(parts, uv_info, chibi_point, source_maps, arm_maps):
    core_names=('Tunic skirt','Face','Ear','Short trousers','Painted leg bindings','Round boot','Sleeve','Bracer','Mittens','Under jacket','Neck bridge','Shoulder bridge')
    core=[p for p in parts if p[0].name.startswith(core_names)]
    equipment=[p for p in parts if p not in core]
    records=[]
    for o,kind,bone in core:
        o.data.calc_loop_triangles()
        records.append((o.name,BVHTree.FromPolygons([v.co.copy() for v in o.data.vertices],[list(t.vertices) for t in o.data.loop_triangles],all_triangles=True),uv_info[o.name]))
    # Preserve the exact approved silhouette, not a second approximation of it.
    source=Path(__file__).resolve().parents[1]/'art-source/wei-infantry/body-proportion-study.blend'
    with bpy.data.libraries.load(str(source),link=False) as (available,loaded):
        loaded.objects=['Long round body — T pose study']
    o=loaded.objects[0];bpy.context.collection.objects.link(o);o.name='Connected anatomical body'
    o.data.materials.clear()
    for old,_,_ in core:bpy.data.objects.remove(old,do_unlink=True)
    for p in o.data.polygons:p.use_smooth=True
    if not o.data.uv_layers:o.data.uv_layers.new(name='UVMap')
    o.data.uv_layers.active.name='UVMap'
    for p in o.data.polygons:
        record=min(records,key=lambda r:r[1].find_nearest(p.center)[3])
        region='arm' if abs(p.center.x)>.43 and p.center.z>1.43 else 'leg' if p.center.z<.9 else None
        if region:
            prefix='Sleeve' if region=='arm' else 'Short trousers'
            record=next(r for r in records if r[0].startswith(prefix))
        name,tree,info=record;kind,cx,cy,span,lo,extent,origin=info
        nearest,normal,_,_=tree.find_nearest(p.center)
        if source_maps[name] is not None:normal=source_maps[name].inverted().to_3x3()@normal
        axis=max(range(3),key=lambda i:abs(normal[i]));axes=(1,2) if axis==0 else (0,2) if axis==1 else (0,1)
        for li in p.loop_indices:
            world=o.data.vertices[o.data.loops[li].vertex_index].co;head=kind in ['face'] or name.startswith('Ear')
            if region:
                if region=='arm':
                    u=(abs(world.x)-.38)/.76;w=(math.atan2(world.z-1.70,-world.y)/math.tau+.5)%1
                else:
                    u=(math.atan2(world.y,world.x-(.215 if world.x>=0 else -.215))/math.tau+.5)%1;w=world.z/1.04
                u=max(0,min(1,u));w=max(0,min(1,w))
                o.data.uv_layers.active.data[li].uv=((cx+.04+u*(span-.08))/8,(cy+.04+w*(span-.08))/8)
                continue
            if source_maps[name] is not None:world=source_maps[name].inverted()@world
            v=inverse_point(world,head)-origin
            if kind=='face':u=(math.atan2(v.y,v.x)/math.tau+.5)%1;w=(v.z-lo[2])/extent[2]
            else:u=(v[axes[0]]-lo[axes[0]])/extent[axes[0]];w=(v[axes[1]]-lo[axes[1]])/extent[axes[1]]
            u=max(0,min(1,u));w=max(0,min(1,w))
            o.data.uv_layers.active.data[li].uv=((cx+.04+u*(span-.08))/8,(cy+.04+w*(span-.08))/8)
    # Explicit normalized multi-bone weights at elbows, knees, hips and neck.
    segments={'pelvis':((0,0,.94),(0,0,1.08)), 'chest':((0,0,1.08),(0,0,1.47))}
    for s in [-1,1]:
        side='L' if s==1 else 'R'
        for name,a,b in [('thigh',(s*.135,0,.94),(s*.15,-.013,.52)),('shin',(s*.15,-.013,.52),(s*.15,.01,.115)),('foot',(s*.15,.01,.115),(s*.15,-.16,.07)),('upper_arm',(s*.28,0,1.425),(s*.37,-.005,1.17)),('forearm',(s*.37,-.005,1.17),(s*.41,-.15,.99)),('hand',(s*.41,-.15,.99),(s*.41,-.19,.92))]:segments[name+'.'+side]=(a,b)
    segments={name:(chibi_point(a),chibi_point(b)) for name,(a,b) in segments.items()}
    segments={name:tuple(arm_maps[name]@v for v in pair) if name in arm_maps else pair for name,pair in segments.items()}
    o.vertex_groups.clear();groups={name:o.vertex_groups.new(name=name) for name in [*segments,'head']}
    def distance(v,a,b):
        d=b-a;t=max(0,min(1,(v-a).dot(d)/d.length_squared));return (v-(a+t*d)).length
    for vert in o.data.vertices:
        v=vert.co
        if v.z>1.74 and abs(v.x)<.30:
            head=max(0,min(1,(v.z-1.74)/.20));weights={'head':head,'chest':1-head}
        elif v.z>1.95:weights={'head':1}
        else:
            side='L' if v.x>=0 else 'R'
            names=['pelvis','thigh.'+side,'shin.'+side,'foot.'+side] if v.z<.9 else ['chest','pelvis','upper_arm.'+side,'forearm.'+side,'hand.'+side] if abs(v.x)>.34 and v.z>1.43 else ['chest','pelvis']
            scored=sorted(((name,1/(.025+distance(v,*segments[name]))**4) for name in names),key=lambda p:-p[1])[:4]
            total=sum(w for _,w in scored);weights={n:w/total for n,w in scored}
        for name,weight in weights.items():
            if weight>0:groups[name].add([vert.index],weight,'REPLACE')
    tag=o.data.attributes.new('connected_body','BOOLEAN','POINT')
    for item in tag.data:item.value=True
    return equipment+[(o,'cloth','chest')]
