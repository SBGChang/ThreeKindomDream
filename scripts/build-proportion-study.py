"""Standalone clay proportion study; does not replace production soldier assets."""
import bpy, bmesh, json
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/models/proportion-study'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/wei-infantry/wei-infantry.blend'))
old=bpy.data.objects['Wei_Infantry_LOD0']
old_mesh=old.data.copy()
keep={i for i,item in enumerate(old_mesh.attributes['connected_body'].data) if item.value}
bm=bmesh.new();bm.from_mesh(old_mesh);bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in keep],context='VERTS');bm.to_mesh(old_mesh);bm.free()
for obj in list(bpy.data.objects):bpy.data.objects.remove(obj,do_unlink=True)
bpy.context.preferences.filepaths.save_version=0
clay=bpy.data.materials.new('Neutral blue clay — proportion only');clay.diffuse_color=(.34,.53,.62,1);clay.use_nodes=True
clay.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=clay.diffuse_color
clay.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8
parts=[]
def sphere(name,loc,scale):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=loc)
    o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);parts.append(o)
    return o

# Longer torso and legs, rather than enlarging the head or squashing the belly.
sphere('Long rounded torso',(0,0,1.31),(.395,.27,.535))
sphere('Soft pelvis',(0,0,.96),(.29,.22,.26))
sphere('Neck',(0,0,1.85),(.112,.115,.18))
# Same nominal head envelope as the existing soldier: .588 wide / .628 high.
sphere('Head',(0,-.025,2.16),(.294,.263,.314))
for s in [-1,1]:
    sphere('Ear',(s*.291,0,2.16),(.052,.045,.078))
    sphere('Long plump leg',(s*.215,0,.49),(.177,.205,.48))
    sphere('Rounded foot',(s*.215,-.065,.115),(.181,.265,.125))
    sphere('Shoulder',(s*.355,0,1.70),(.19,.175,.18))
    sphere('Upper arm',(s*.535,0,1.70),(.255,.145,.15))
    sphere('Forearm',(s*.79,0,1.70),(.225,.128,.135))
    sphere('Mitten',(s*.985,-.005,1.70),(.145,.137,.137))
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='Long round body — T pose study'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
body.data.remesh_voxel_size=.022;bpy.ops.object.voxel_remesh()
m=body.modifiers.new('Round transitions','SMOOTH');m.factor=.75;m.iterations=4;bpy.ops.object.modifier_apply(modifier=m.name)
body.data.calc_loop_triangles();m=body.modifiers.new('Study topology','DECIMATE');m.ratio=min(1,2800/len(body.data.loop_triangles));bpy.ops.object.modifier_apply(modifier=m.name)
for p in body.data.polygons:p.use_smooth=True
body.data.materials.clear();body.data.materials.append(clay)
old=bpy.data.objects.new('Previous short body — same display scale',old_mesh);bpy.context.collection.objects.link(old)
old.data.materials.clear();old.data.materials.append(clay);old.hide_render=True
# Actual vertex-edge connected-component test.
neighbors={v.index:set() for v in body.data.vertices}
for e in body.data.edges:
    a,b=e.vertices;neighbors[a].add(b);neighbors[b].add(a)
seen=set();pending=[0]
while pending:
    i=pending.pop()
    if i not in seen:seen.add(i);pending.extend(neighbors[i]-seen)
assert len(seen)==len(body.data.vertices),'Disconnected body'
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=800;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.color=(.12,.12,.12)
for loc,power,size in [((3,-4,6),600,4),((-3,-2,3),350,3),((1,3,4),500,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,1.2))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=2.95
def render(name,loc):
    camera.location=loc;camera.rotation_euler=(Vector((0,0,1.24))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
render('front',(0,-7,1.24));render('side',(7,0,1.24));render('hero',(3,-6,2.7))
body.hide_render=True;old.hide_render=False;render('previous',(0,-7,1.24))
body.hide_render=False;old.hide_render=True;old.hide_viewport=True
camera.location=(0,-7,1.24);camera.rotation_euler=(Vector((0,0,1.24))-camera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
bpy.ops.export_scene.gltf(filepath=str(OUT/'body-study.glb'),use_selection=True,export_format='GLB',export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art-source/wei-infantry/body-proportion-study.blend'))
body.data.calc_loop_triangles()
(OUT/'manifest.json').write_text(json.dumps({'status':'proportion-study-only','triangles':len(body.data.loop_triangles),'connectedComponents':1,'headWidth':.588,'headHeight':.628,'height':2.474,'shoulderHeight':1.70,'animations':False,'uv':False},indent=2))
print('PASS: connected T-pose proportion study; production assets untouched')
