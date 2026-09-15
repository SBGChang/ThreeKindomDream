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
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=loc)
    o=bpy.context.object;o.scale=scale
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,mat,bone)

def rod(name,a,b,r,mat,bone,r2=None,vertices=10):
    d=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if r2 is None else r2,depth=d.length,location=(Vector(a)+Vector(b))/2)
    o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    return finish(o,name,mat,bone)

box('Padded jacket',(0,0,1.21),(.49,.29,.49),'cloth','chest',.045)
box('Tunic skirt',(0,.015,.90),(.46,.30,.22),'cloth','pelvis',.025)
rod('Neck',(0,0,1.43),(0,0,1.56),.073,'skin','head')
ellipsoid('Face',(0,-.012,1.64),(.112,.101,.146),'skin','head')
ellipsoid('Nose',(0,-.107,1.633),(.023,.041,.037),'skin','head')
for s in [-1,1]:
    ellipsoid('Ear',(s*.112,0,1.633),(.025,.023,.042),'skin','head')
    box('Eyebrow',(s*.046,-.102,1.684),(.061,.016,.013),'dark','head',.003)
    ellipsoid('Eye',(s*.046,-.106,1.665),(.020,.012,.009),'dark','head')
box('Mouth',(0,-.103,1.592),(.048,.008,.009),'dark','head',.002)
# Hemispherical iron helmet with brow band, neck and cheek guards.
verts=[(0,0,1.82)];faces=[]
for j in range(1,6):
    a=j/5*math.pi/2
    for i in range(24):
        t=i*math.tau/24;verts.append((.135*math.sin(a)*math.cos(t),.117*math.sin(a)*math.sin(t),1.70+.12*math.cos(a)))
for i in range(24):faces.append((0,1+i,1+(i+1)%24))
for j in range(4):
    for i in range(24):
        k=1+j*24+i;n=1+j*24+(i+1)%24;faces.append((k,n,n+24,k+24))
mesh=bpy.data.meshes.new('Helmet shell');mesh.from_pydata(verts,[],faces);mesh.update()
o=bpy.data.objects.new('Riveted iron helmet',mesh);bpy.context.collection.objects.link(o);parts.append((o,'iron','head'))
for i in range(16):
    t=i*math.tau/16
    ellipsoid('Helmet rivet',(.132*math.cos(t),.119*math.sin(t),1.707),(.009,.009,.009),'brass','head')
for s in [-1,1]:
    box('Cheek guard',(s*.118,-.012,1.608),(.025,.127,.14),'iron','head',.014)
box('Nape guard',(0,.099,1.615),(.21,.041,.17),'iron','head',.013)
rod('Helmet finial',(0,0,1.81),(0,0,1.88),.028,'brass','head',.012)
# Lamellae across chest and back: individually bevelled, overlapping courses.
for back in [-1,1]:
    for row in range(5):
        for col in range(7):
            x=(col-3)*.059; z=1.425-row*.068
            box('Lamella', (x,back*(.153+.01*math.cos(col)),z),(.055,.019,.082),'iron','chest',.006)
            if back==-1:
                rod('Lacing',(x-.014,-.172,z+.015),(x+.014,-.172,z+.015),.003,'leather','chest',vertices=6)
box('Belt',(0,-.006,1.015),(.50,.335,.063),'leather','pelvis',.013)
box('Belt buckle',(0,-.183,1.015),(.08,.025,.063),'brass','pelvis',.007)
for s in [-1,1]:
    side='L' if s==1 else 'R'
    hip=(s*.135,0,.94);knee=(s*.15,-.013,.52);ankle=(s*.15,.01,.115)
    rod('Trouser thigh',hip,knee,.106,'cloth','thigh.'+side,.083)
    rod('Shin',knee,ankle,.074,'cloth','shin.'+side,.057)
    for j in range(6):
        rod('Leg binding',(s*.15,.002,.20+j*.045),(s*.15,.002,.214+j*.045),.077,'leather','shin.'+side)
    box('Leather boot',(s*.15,-.05,.08),(.145,.25,.135),'leather','foot.'+side,.023)
    box('Boot sole',(s*.15,-.05,.023),(.151,.26,.035),'dark','foot.'+side,.009)
    for row in range(3):
        for col in range(3):
            box('Skirt lamella',(s*.12+(col-1)*.061,-.176,.95-row*.063),(.057,.025,.076),'iron','thigh.'+side,.005)
    shoulder=(s*.28,0,1.425);elbow=(s*.37,-.005,1.17);hand=(s*.41,-.15,.99)
    rod('Sleeve',shoulder,elbow,.089,'cloth','upper_arm.'+side,.069)
    rod('Forearm',elbow,hand,.060,'leather','forearm.'+side,.043)
    ellipsoid('Hand',hand,(.054,.049,.062),'skin','hand.'+side)
    for row in range(3):
        box('Shoulder armor',(s*(.28+row*.016),-.005,1.435-row*.047),(.18,.25,.046),'iron','upper_arm.'+side,.013)
    box('Bracer',(s*.398,-.097,1.085),(.111,.098,.14),'iron','forearm.'+side,.012)
# Left shield: wood core, iron rim strips, brass boss, straps.
box('Shield wood',(.45,-.25,1.05),(.33,.065,.57),'wood','hand.L',.06)
box('Shield painted face',(.45,-.292,1.05),(.29,.025,.52),'cloth','hand.L',.04)
for s in [-1,1]:
    box('Shield rim',(.45+s*.151,-.31,1.05),(.024,.025,.47),'iron','hand.L',.006)
    box('Shield rim',(.45,-.31,1.05+s*.247),(.265,.025,.025),'iron','hand.L',.006)
    box('Shield ornament',(.45+s*.059,-.314,1.05),(.017,.014,.41),'brass','hand.L',.003)
ellipsoid('Shield boss',(.45,-.328,1.06),(.064,.037,.064),'brass','hand.L')
rod('Ash spear shaft',(-.41,-.15,.1),(-.41,-.15,2.16),.015,'wood','hand.R',vertices=12)
rod('Spear socket',(-.41,-.15,2.06),(-.41,-.15,2.19),.026,'iron','hand.R',.019)
rod('Spear leaf',(-.41,-.15,2.16),(-.41,-.15,2.43),.06,'steel','hand.R',0,4)
for j in range(5):
    rod('Spear grip',(-.41,-.15,.91+j*.024),(-.41,-.15,.925+j*.024),.020,'leather','hand.R')

# Every part owns a non-overlapping atlas cell; unwrap before armature assembly.
N=2048; grid=math.ceil(math.sqrt(len(parts))); tile=N//grid
base=np.zeros((N,N,4),dtype=np.float32);base[:]=(.06,.06,.06,1)
orm=base.copy();normal=base.copy();normal[:]=(.5,.5,1,1)
rng=np.random.default_rng(810)
for idx,(o,kind,bone) in enumerate(parts):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(island_margin=.045);bpy.ops.object.mode_set(mode='OBJECT')
    cx=idx%grid;cy=idx//grid
    for uv in o.data.uv_layers.active.data:uv.uv=((cx+.06+uv.uv.x*.88)/grid,(cy+.06+uv.uv.y*.88)/grid)
    x0=round(cx*N/grid);x1=round((cx+1)*N/grid);y0=round(cy*N/grid);y1=round((cy+1)*N/grid)
    h=y1-y0;w=x1-x0;yy,xx=np.mgrid[:h,:w];p=palette[kind]
    noise=rng.normal(0,.024,(h,w));grain=np.sin(xx*1.8)*np.sin(yy*1.8)*.035 if kind=='cloth' else np.sin(xx*.52+np.sin(yy*.05))*.05 if kind in ['wood','leather'] else np.zeros((h,w))
    edge=(np.minimum.reduce([xx,yy,w-1-xx,h-1-yy])<7)*.055 if kind in ['iron','brass','steel'] else 0
    base[y0:y1,x0:x1,:3]=np.clip(np.array(p[:3])[None,None,:]*(1+noise[:,:,None]+grain[:,:,None])+np.asarray(edge)[...,None],0,1)
    base[y0:y1,x0:x1,3]=1
    orm[y0:y1,x0:x1,:]=np.stack([np.ones((h,w)),np.clip(p[4]+noise,0,1),np.full((h,w),p[3]),np.ones((h,w))],axis=-1)
    normal[y0:y1,x0:x1,0]=.5+noise*.22
    normal[y0:y1,x0:x1,1]=.5+grain*.35
    vg=o.vertex_groups.new(name=bone);vg.add(list(range(len(o.data.vertices))),1,'REPLACE')

def save_image(name,arr):
    im=bpy.data.images.new(name,width=arr.shape[1],height=arr.shape[0],alpha=True)
    if name in ['infantry-normal','infantry-orm']:im.colorspace_settings.name='Non-Color'
    im.pixels.foreach_set(arr.ravel());im.filepath_raw=str(OUT/(name+'.png'));im.file_format='PNG';im.save();return im

albedo=save_image('infantry-basecolor',base)
packed=save_image('infantry-orm',orm);packed.colorspace_settings.name='Non-Color'
nmap=save_image('infantry-normal',normal);nmap.colorspace_settings.name='Non-Color'
mat=bpy.data.materials.new('Wei infantry • UV PBR');mat.use_nodes=True
nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
def tex(im):
    n=nodes.new('ShaderNodeTexImage');n.image=im;return n
links.new(tex(albedo).outputs['Color'],bs.inputs['Base Color'])
sep=nodes.new('ShaderNodeSeparateColor');links.new(tex(packed).outputs['Color'],sep.inputs[0]);links.new(sep.outputs['Green'],bs.inputs['Roughness']);links.new(sep.outputs['Blue'],bs.inputs['Metallic'])
nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.35;links.new(tex(nmap).outputs['Color'],nm.inputs['Color']);links.new(nm.outputs[0],bs.inputs['Normal'])
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
    b=rig.data.edit_bones.new(name);b.head=head;b.tail=tail
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

# Studio and orthographic turnarounds, all rendered from the same textured mesh.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.resolution_percentage=100
scene.world.color=(.22,.22,.22)
def area(name,loc,power,size):
    bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,1))-l.location).to_track_quat('-Z','Y').to_euler()
area('Key softbox',(3,-4,6),500,4);area('Cool fill',(-3,-2,3),350,3);area('Rim',(1,3,4),650,3)
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=2.75
def camera_at(loc,target=(0,0,1.2)):
    camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=640;scene.render.resolution_y=640
for label,loc in [('front',(0,-6,1.2)),('side',(6,0,1.2)),('back',(0,6,1.2)),('hero',(3,-5,2.5))]:
    camera_at(loc);scene.render.filepath=str(OUT/(label+'.png'));bpy.ops.render.render(write_still=True)
# Small sprite strips let the existing SVG battlefield use Blender animation without 192 WebGL rigs.
scene.render.resolution_x=192;scene.render.resolution_y=192;scene.cycles.samples=8
camera_at((-3,-5,2.6));camera.data.ortho_scale=2.9
sprite_meta={}
for name,(action,end) in clips.items():
    rig.animation_data.action=action;strip_pixels=np.zeros((192,192*8,4),dtype=np.float32)
    for i in range(8):
        scene.frame_set(round(1+(end-1)*i/(8 if name in ['Idle','Run','Cheer'] else 7)))
        frame_path=SOURCE/'.frame-temp.png';scene.render.filepath=str(frame_path);bpy.ops.render.render(write_still=True)
        im=bpy.data.images.load(str(frame_path),check_existing=False);arr=np.array(im.pixels[:],dtype=np.float32).reshape(192,192,4);strip_pixels[:,i*192:(i+1)*192]=arr;bpy.data.images.remove(im)
    save_image(name.lower(),strip_pixels);sprite_meta[name]={'frames':8,'seconds':end/24}
frame_path.unlink(missing_ok=True)
rig.animation_data.action=clips['Idle'][0];scene.frame_set(1);scene.render.resolution_x=640;scene.render.resolution_y=640;camera_at((3,-5,2.5))
for im in [albedo,packed,nmap]:im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'wei-infantry.blend'))
body.data.calc_loop_triangles()
(OUT/'manifest.json').write_text(json.dumps({'vertices':len(body.data.vertices),'triangles':len(body.data.loop_triangles),'bones':len(rig.data.bones),'atlas':2048,'uvParts':len(parts),'animations':sprite_meta},indent=2))
print('SOLDIER COMPLETE',str(OUT),flush=True)
