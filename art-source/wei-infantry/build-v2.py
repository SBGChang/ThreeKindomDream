"""Run with Blender 4.5: blender -b --python scripts/build-soldier.py.
Deterministic original mesh, UV atlas, armature, actions, GLB and rendered sprites.
"""
import bpy, math, json, os
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/models/wei-infantry'
SOURCE = ROOT / 'art-source/wei-infantry'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
parts = []
# Coordinates: X right, -Y front, Z up. Height ~1.8m; spear 2.4m.
palette = {'iron':(.19,.26,.29,.72,.46), 'brass':(.57,.39,.16,.78,.38),
           'cloth':(.10,.22,.34,0,.87), 'leather':(.17,.085,.043,0,.83),
           'skin':(.57,.34,.21,0,.70), 'wood':(.29,.15,.055,0,.78),
           'dark':(.035,.027,.024,0,.9), 'steel':(.55,.61,.63,.88,.28)}

def finish(o,name,mat,bone):
    o.name=name
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    parts.append((o,mat,bone))
    return o

def box(name,loc,scale,mat,bone,bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        m=o.modifiers.new('Rounded forged edges','BEVEL');m.width=bevel;m.segments=1
        bpy.ops.object.modifier_apply(modifier=m.name)
    return finish(o,name,mat,bone)

def ellipsoid(name,loc,scale,mat,bone):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,location=loc)
    o=bpy.context.object;o.scale=scale
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,mat,bone)

def rod(name,a,b,r,mat,bone,r2=None,vertices=10):
    d=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if r2 is None else r2,depth=d.length,location=(Vector(a)+Vector(b))/2)
    o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    return finish(o,name,mat,bone)

# Silhouette only: one shell per armor section. Surface details live in UV paint.
box('Painted cuirass',(0,0,1.23),(.53,.32,.43),'armor','chest',.035)
box('Tunic skirt',(0,.015,.92),(.48,.31,.20),'cloth','pelvis',.02)
ellipsoid('Face',(0,-.012,1.635),(.125,.112,.146),'face','head')
for s in [-1,1]:
    ellipsoid('Ear',(s*.125,0,1.63),(.025,.022,.04),'skin','head')
# Low-resolution helmet dome; no individual rivets or plates.
verts=[(0,0,1.82)];faces=[]
for j in range(1,4):
    a=j/3*math.pi/2
    for i in range(12):
        t=i*math.tau/12;verts.append((.14*math.sin(a)*math.cos(t),.125*math.sin(a)*math.sin(t),1.70+.12*math.cos(a)))
for i in range(12):faces.append((0,1+i,1+(i+1)%12))
for j in range(2):
    for i in range(12):
        k=1+j*12+i;n=1+j*12+(i+1)%12;faces.append((k,n,n+12,k+12))
mesh=bpy.data.meshes.new('Helmet shell');mesh.from_pydata(verts,[],faces);mesh.update()
o=bpy.data.objects.new('Painted helmet',mesh);bpy.context.collection.objects.link(o)
for p in mesh.polygons:p.use_smooth=True
parts.append((o,'helmet','head'))
for s in [-1,1]:
    box('Cheek guard',(s*.127,.015,1.61),(.022,.116,.13),'iron','head',.01)
rod('Helmet tassel',(0,0,1.81),(0,0,1.91),.028,'cloth','head',.045,6)
box('Painted belt',(0,-.009,1.01),(.54,.35,.072),'belt','pelvis',0)
for s in [-1,1]:
    side='L' if s==1 else 'R'
    hip=(s*.14,0,.94);knee=(s*.16,-.013,.52);ankle=(s*.16,.01,.115)
    rod('Short trousers',hip,knee,.112,'cloth','thigh.'+side,.09,8)
    rod('Painted leg bindings',knee,ankle,.084,'bindings','shin.'+side,.068,8)
    box('Round boot',(s*.16,-.045,.095),(.18,.27,.17),'leather','foot.'+side,.025)
    shoulder=(s*.29,0,1.425);elbow=(s*.38,-.005,1.17);hand=(s*.42,-.15,.99)
    rod('Sleeve',shoulder,elbow,.105,'cloth','upper_arm.'+side,.077,8)
    rod('Bracer',elbow,hand,.077,'iron','forearm.'+side,.059,8)
    ellipsoid('Mittens',hand,(.072,.065,.085),'skin','hand.'+side)
    box('Painted shoulder',(s*.29,0,1.425),(.20,.28,.11),'armor','upper_arm.'+side,.02)
box('Painted shield',(.47,-.29,1.075),(.36,.082,.54),'shield','hand.L',.04)
rod('Spear shaft',(-.42,-.15,.1),(-.42,-.15,2.10),.023,'wood','hand.R',vertices=6)
rod('Spear tip',(-.42,-.15,2.10),(-.42,-.15,2.38),.065,'steel','hand.R',0,4)

def chibi_point(v,head=False,weapon=False):
    x,y,z=v
    return Vector((x*(2.35 if head else 1.25),y*(2.35 if head else 1.25),
                   .882+(z-1.47)*2.15 if head else .594+(z-.99)*.68 if weapon else z*.60))

# Planar paint islands intentionally share opposite faces. Head uses cylindrical UV.
N=1024;grid=8
base=np.zeros((N,N,4),dtype=np.float32);base[:]=(.04,.055,.07,1)
enemy_base=base.copy();orm=base.copy();normal=base.copy();normal[:]=(.5,.5,1,1)
palette.update({'armor':(.12,.30,.44,.15,.78),'helmet':(.17,.35,.48,.18,.75),
                'shield':(.07,.31,.55,.1,.78),'face':(.78,.51,.31,0,.88),
                'belt':(.20,.10,.045,0,.86),'bindings':(.53,.39,.22,0,.88)})
enemy_palette={'armor':(.45,.10,.085,.15,.78),'helmet':(.37,.10,.09,.18,.75),
               'cloth':(.63,.075,.045,0,.87),'shield':(.59,.065,.04,.1,.78)}
for idx,(o,kind,bone_name) in enumerate(parts):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    if not o.data.uv_layers:o.data.uv_layers.new(name='PaintUV')
    o.data.uv_layers.active.name='UVMap'
    points=np.array([v.co[:] for v in o.data.vertices]);lo=points.min(axis=0);extent=np.maximum(points.max(axis=0)-lo,.00001)
    cx,cy=(0,0) if kind=='face' else ((idx+16)%8,(idx+16)//8)
    span=2 if kind=='face' else 1
    for p in o.data.polygons:
        normal_axis=max(range(3),key=lambda axis:abs(p.normal[axis]))
        axes=(1,2) if normal_axis==0 else (0,2) if normal_axis==1 else (0,1)
        for li in p.loop_indices:
            v=o.data.vertices[o.data.loops[li].vertex_index].co
            if kind in ['face','helmet']:
                u=(math.atan2(v.y,v.x)/math.tau+.5)%1;w=(v.z-lo[2])/extent[2]
                angles=[(math.atan2(o.data.vertices[o.data.loops[k].vertex_index].co.y,o.data.vertices[o.data.loops[k].vertex_index].co.x)/math.tau+.5)%1 for k in p.loop_indices]
                if max(angles)-min(angles)>.5 and u<.1:u=1
            else:u=(v[axes[0]]-lo[axes[0]])/extent[axes[0]];w=(v[axes[1]]-lo[axes[1]])/extent[axes[1]]
            o.data.uv_layers.active.data[li].uv=((cx+.04+u*(span-.08))/grid,(cy+.04+w*(span-.08))/grid)
    x0=cx*N//grid;x1=(cx+span)*N//grid;y0=cy*N//grid;y1=(cy+span)*N//grid
    h=y1-y0;w=x1-x0;yy,xx=np.mgrid[:h,:w];u=xx/(w-1);v=yy/(h-1)
    # Match the interior UV rectangle, so painted borders remain visible with padding.
    u=(u-.04/span)/(1-.08/span);v=(v-.04/span)/(1-.08/span)
    for target,pal,faction in [(base,palette,'host'),(enemy_base,{**palette,**enemy_palette},'enemy')]:
        color=pal[kind];paint=np.zeros((h,w,3),dtype=np.float32);paint[:]=color[:3]
        paint*= (.9+.16*v[:,:,None])
        def ink(mask,c):paint[mask]=c
        border=(u<.045)|(u>.955)|(v<.045)|(v>.955)
        if kind=='armor':
            sx=(u*5)%1;sy=(v*4)%1
            ink((sx<.07)|(sy<.10),(.04,.07,.095))
            ink((sy>.85)&(sx>.1),tuple(min(1,c*1.45) for c in color[:3]))
            ink(((sx-.5)**2+(sy-.70)**2<.025),(.72,.53,.25))
        if kind=='helmet':
            ink(v<.20, (.035,.07,.11) if faction=='host' else (.12,.025,.02))
            ink((v>.18)&(v<.24),(.86,.65,.27))
            ink((((u*8)%1-.5)**2+(v-.1)**2<.005),(.9,.73,.4))
        if kind=='bindings':
            ink(((v*6)%1)<.18,(.22,.13,.075))
            ink((((v*6+u*.5)%1)>.8),(.71,.56,.35))
        if kind=='belt':
            ink(border,(.075,.04,.023));ink((abs(u-.5)<.12)&(abs(v-.5)<.37),(.88,.60,.20))
        if kind=='shield':
            ink(border,(.9,.66,.29))
            if faction=='host': # Cream chevron on blue.
                ink((abs(v-(.3+abs(u-.5)*.8))<.045)&(u>.17)&(u<.83),(.95,.85,.58))
                ink((abs(u-.5)<.045)&(v>.5)&(v<.85),(.95,.85,.58))
            else: # Dark diamond and ivory bar on red.
                ink((abs(u-.5)+abs(v-.52))<.29,(.14,.035,.03))
                ink((abs(v-.52)<.035)&(u>.25)&(u<.75),(.95,.83,.54))
        if kind=='face':
            for center in [.175,.325]:
                ink(((u-center)/.037)**2+((v-.54)/.105)**2<1,(.045,.025,.02))
                ink(((u-(center-.009))/.012)**2+((v-.585)/.026)**2<1,(1,.97,.84))
                ink((abs(u-center)<.039)&(abs(v-(.69+.45*(u-center)))<.015),(.13,.065,.035))
                ink(((u-center)/.045)**2+((v-.35)/.035)**2<1,(.9,.37,.27))
            ink((abs(u-.25)<.04)&(abs(v-(.285+15*(u-.25)**2))<.012),(.27,.07,.035))
        target[y0:y1,x0:x1,:3]=np.clip(paint,0,1);target[y0:y1,x0:x1,3]=1
    color=palette[kind]
    orm[y0:y1,x0:x1,:]=[1,color[4],color[3],1]
    vg=o.vertex_groups.new(name=bone_name);vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
    world=o.matrix_world.copy()
    for vertex in o.data.vertices:vertex.co=chibi_point(world@vertex.co,bone_name=='head',o.name.startswith('Spear'))
    o.location=(0,0,0);o.data.update()

def save_image(name,arr):
    im=bpy.data.images.new(name,width=arr.shape[1],height=arr.shape[0],alpha=True)
    if name in ['infantry-normal','infantry-orm']:im.colorspace_settings.name='Non-Color'
    im.pixels.foreach_set(arr.ravel());im.filepath_raw=str(OUT/(name+'.png'));im.file_format='PNG';im.save();return im

albedo=save_image('infantry-basecolor',base)
enemy_albedo=save_image('infantry-enemy-basecolor',enemy_base)
packed=save_image('infantry-orm',orm);packed.colorspace_settings.name='Non-Color'
nmap=save_image('infantry-normal',normal);nmap.colorspace_settings.name='Non-Color'
mat=bpy.data.materials.new('Wei infantry • UV PBR');mat.use_nodes=True
nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
def tex(im):
    n=nodes.new('ShaderNodeTexImage');n.image=im;return n
color_node=tex(albedo)
links.new(color_node.outputs['Color'],bs.inputs['Base Color'])
sep=nodes.new('ShaderNodeSeparateColor');links.new(tex(packed).outputs['Color'],sep.inputs[0]);links.new(sep.outputs['Green'],bs.inputs['Roughness']);links.new(sep.outputs['Blue'],bs.inputs['Metallic'])
nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.35;links.new(tex(nmap).outputs['Color'],nm.inputs['Color']);links.new(nm.outputs[0],bs.inputs['Normal'])
enemy_material=mat.copy();enemy_material.name='Enemy infantry • Red diamond UV';enemy_material.use_fake_user=True
enemy_material.node_tree.nodes[color_node.name].image=enemy_albedo
bpy.ops.object.select_all(action='DESELECT')
for o,_,_ in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0][0];bpy.ops.object.join();body=bpy.context.object;body.name='Wei_Infantry_LOD0';body.data.materials.clear();body.data.materials.append(mat)
# UV line sheet is exported from actual loop coordinates (white on dark atlas).
wire=np.zeros((N,N,4),dtype=np.float32);wire[:]=(.035,.05,.065,1)
uvs=body.data.uv_layers.active.data
for poly in body.data.polygons:
    ids=list(poly.loop_indices)
    for a,b in zip(ids,ids[1:]+ids[:1]):
        va=uvs[a].uv;vb=uvs[b].uv;steps=max(2,int((va-vb).length*N*2))
        xs=np.clip(np.linspace(va.x,vb.x,steps)*N,0,N-1).astype(int);ys=np.clip(np.linspace(va.y,vb.y,steps)*N,0,N-1).astype(int)
        wire[ys,xs]=(.65,.87,.91,1)
save_image('infantry-uv-layout',wire)

# Explicit segmented armor weights: rigid plates follow anatomical bones.
bpy.ops.object.armature_add();rig=bpy.context.object;rig.name='Wei_Infantry_Rig';bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
def bone(name,head,tail,parent=None):
    b=rig.data.edit_bones.new(name);b.head=chibi_point(head);b.tail=chibi_point(tail,name=='head')
    if parent:b.parent=rig.data.edit_bones[parent]
bone('root',(0,0,0),(0,0,.2));bone('pelvis',(0,0,.94),(0,0,1.08),'root');bone('chest',(0,0,1.08),(0,0,1.47),'pelvis');bone('head',(0,0,1.47),(0,0,1.8),'chest')
for s in [-1,1]:
    side='L' if s==1 else 'R'
    bone('thigh.'+side,(s*.135,0,.94),(s*.15,-.013,.52),'pelvis')
    bone('shin.'+side,(s*.15,-.013,.52),(s*.15,.01,.115),'thigh.'+side)
    bone('foot.'+side,(s*.15,.01,.115),(s*.15,-.16,.07),'shin.'+side)
    bone('upper_arm.'+side,(s*.28,0,1.425),(s*.37,-.005,1.17),'chest')
    bone('forearm.'+side,(s*.37,-.005,1.17),(s*.41,-.15,.99),'upper_arm.'+side)
    bone('hand.'+side,(s*.41,-.15,.99),(s*.41,-.19,.92),'forearm.'+side)
bpy.ops.object.mode_set(mode='OBJECT');mod=body.modifiers.new('Armature','ARMATURE');mod.object=rig;body.parent=rig
for pb in rig.pose.bones:pb.rotation_mode='XYZ'
clips={}
for name,end in [('Idle',48),('Run',24),('Thrust',32),('Hit',20),('Death',40),('Cheer',40)]:
    action=bpy.data.actions.new(name);rig.animation_data_create();rig.animation_data.action=action
    for frame in range(1,end+1,2):
        u=(frame-1)/(end-1);wave=math.sin(u*math.tau)
        for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
        p=rig.pose.bones
        if name=='Idle':p['chest'].rotation_euler.x=.018*wave
        if name=='Run':
            for s in [-1,1]:
                side='L' if s==1 else 'R';p['thigh.'+side].rotation_euler.x=.60*wave*s;p['shin.'+side].rotation_euler.x=-max(0,wave*s)*.85
                p['upper_arm.'+side].rotation_euler.x=-.28*wave*s
            p['pelvis'].location.y=abs(wave)*.045
        if name=='Thrust':
            pulse=math.sin(math.pi*u)**2;p['chest'].rotation_euler.x=.12*pulse;p['upper_arm.R'].rotation_euler.x=.95*pulse;p['forearm.R'].rotation_euler.x=.50*pulse;p['hand.R'].rotation_euler.x=.20*pulse
        if name=='Hit':p['chest'].rotation_euler.x=-.30*math.sin(math.pi*u);p['head'].rotation_euler.x=-.2*math.sin(math.pi*u)
        if name=='Death':
            fall=min(1,u*1.6);p['root'].rotation_euler.x=-1.48*fall;p['root'].location.z=-.03*fall;p['upper_arm.L'].rotation_euler.z=.35*fall
        if name=='Cheer':p['upper_arm.R'].rotation_euler.x=-2.3*(.8+.12*wave);p['forearm.R'].rotation_euler.x=-.3;p['chest'].rotation_euler.x=-.07
        for pb in p:
            pb.keyframe_insert('rotation_euler',frame=frame);pb.keyframe_insert('location',frame=frame)
    # Explicit final key: loops close exactly; death stays fallen.
    bpy.context.scene.frame_set(1 if name in ['Idle','Run','Cheer'] else end-2)
    for pb in rig.pose.bones:pb.keyframe_insert('rotation_euler',frame=end);pb.keyframe_insert('location',frame=end)
    track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,1,action);track.mute=True
    clips[name]=(action,end)
rig.animation_data.action=clips['Idle'][0];bpy.context.scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'wei-infantry.glb'),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_force_sampling=True)
color_node.image=enemy_albedo
bpy.ops.export_scene.gltf(filepath=str(OUT/'enemy-infantry.glb'),export_format='GLB',use_selection=True,export_animation_mode='ACTIONS',export_force_sampling=True)
color_node.image=albedo

# Studio and orthographic turnarounds, all rendered from the same textured mesh.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.resolution_percentage=100
scene.world.color=(.22,.22,.22)
def area(name,loc,power,size):
    bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,1))-l.location).to_track_quat('-Z','Y').to_euler()
area('Key softbox',(3,-4,6),500,4);area('Cool fill',(-3,-2,3),350,3);area('Rim',(1,3,4),650,3)
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=2.1
def camera_at(loc,target=(0,0,.85)):
    camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=640;scene.render.resolution_y=640
for label,loc in [('front',(0,-6,1.2)),('side',(6,0,1.2)),('back',(0,6,1.2)),('hero',(3,-5,2.5))]:
    camera_at(loc if label=='hero' else (loc[0],loc[1],.85));scene.render.filepath=str(OUT/(label+'.png'));bpy.ops.render.render(write_still=True)
color_node.image=enemy_albedo
camera_at((3,-5,2.5));scene.render.filepath=str(OUT/'enemy-hero.png');bpy.ops.render.render(write_still=True)
color_node.image=albedo
# Small sprite strips let the existing SVG battlefield use Blender animation without 192 WebGL rigs.
scene.render.resolution_x=192;scene.render.resolution_y=192;scene.cycles.samples=8
camera_at((-3,-5,2.3));camera.data.ortho_scale=2.25
sprite_meta={}
for faction,texture in [('host',albedo),('enemy',enemy_albedo)]:
    color_node.image=texture
    for name,(action,end) in clips.items():
        rig.animation_data.action=action;strip_pixels=np.zeros((192,192*8,4),dtype=np.float32)
        for i in range(8):
            scene.frame_set(round(1+(end-1)*i/(8 if name in ['Idle','Run','Cheer'] else 7)))
            frame_path=SOURCE/'.frame-temp.png';scene.render.filepath=str(frame_path);bpy.ops.render.render(write_still=True)
            im=bpy.data.images.load(str(frame_path),check_existing=False);arr=np.array(im.pixels[:],dtype=np.float32).reshape(192,192,4);strip_pixels[:,i*192:(i+1)*192]=arr;bpy.data.images.remove(im)
        save_image(('enemy-' if faction=='enemy' else '')+name.lower(),strip_pixels);sprite_meta[name]={'frames':8,'seconds':end/24}
color_node.image=albedo
frame_path.unlink(missing_ok=True)
rig.animation_data.action=clips['Idle'][0];scene.frame_set(1);scene.render.resolution_x=640;scene.render.resolution_y=640;camera_at((3,-5,2.5))
for im in [albedo,enemy_albedo,packed,nmap]:im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'wei-infantry.blend'))
body.data.calc_loop_triangles()
(OUT/'manifest.json').write_text(json.dumps({'style':'chibi','vertices':len(body.data.vertices),'triangles':len(body.data.loop_triangles),'bones':len(rig.data.bones),'atlas':N,'uvParts':len(parts),'factions':['host','enemy'],'animations':sprite_meta},indent=2))
print('SOLDIER COMPLETE',str(OUT),flush=True)
