import bpy,json,math
from pathlib import Path
root=Path(__file__).resolve().parents[1]
mesh=bpy.data.objects['Wei_Infantry_LOD0'];rig=bpy.data.objects['Wei_Infantry_Rig']
assert len(rig.data.bones)==17
for side in ['L','R']:
    for name in ['upper_arm','forearm','hand']:
        b=rig.data.bones[name+'.'+side]
        assert abs(b.head_local.z-b.tail_local.z)<.0001, 'Rest arms must be horizontal T pose'
mesh.data.calc_loop_triangles()
assert len(mesh.data.loop_triangles)<3600, 'Approved-body triangle budget exceeded'
core={i for i,item in enumerate(mesh.data.attributes['connected_body'].data) if item.value}
assert core, 'Missing welded-body vertex tag'
with bpy.data.libraries.load(str(root/'art-source/wei-infantry/body-proportion-study.blend'),link=False) as (_,loaded):
    loaded.objects=['Long round body — T pose study']
approved=loaded.objects[0]
actual=sorted(tuple(round(c,5) for c in mesh.data.vertices[i].co) for i in core)
expected=sorted(tuple(round(c,5) for c in v.co) for v in approved.data.vertices)
assert actual==expected, 'Approved body proportions changed'
bpy.data.objects.remove(approved,do_unlink=True)
neighbors={i:set() for i in core}
for edge in mesh.data.edges:
    a,b=edge.vertices
    if a in core and b in core:neighbors[a].add(b);neighbors[b].add(a)
visited=set();pending=[next(iter(core))]
while pending:
    i=pending.pop()
    if i not in visited:visited.add(i);pending.extend(neighbors[i]-visited)
assert visited==core, 'Anatomical body has disconnected islands'
assert sum(len(mesh.data.vertices[i].groups)>1 for i in core)>len(core)*.3, 'Insufficient blended skin weights'
assert all(v.groups and abs(sum(g.weight for g in v.groups)-1)<.001 for v in mesh.data.vertices)
assert all(0<=d.uv.x<=1 and 0<=d.uv.y<=1 for d in mesh.data.uv_layers.active.data)
assert all(bpy.data.images[name].packed_file for name in ['infantry-basecolor','infantry-enemy-basecolor','infantry-orm','infantry-normal'])
assert set(['Idle','Run','Thrust','Hit','Death','Cheer']).issubset(bpy.data.actions.keys())
path=root/'public/models/wei-infantry/wei-infantry.glb'
raw=path.read_bytes();length=int.from_bytes(raw[12:16],'little');doc=json.loads(raw[20:20+length])
assert len(doc['skins'])==1
assert set(a['name'] for a in doc['animations'])==set(['Idle','Run','Thrust','Hit','Death','Cheer'])
assert all(a['channels'] for a in doc['animations'])
assert len(doc['images'])>=3
other=(root/'public/models/wei-infantry/enemy-infantry.glb').read_bytes()
size=int.from_bytes(other[12:16],'little');enemy=json.loads(other[20:20+size])
def accessor_bytes(raw,doc,index):
    a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
    json_length=int.from_bytes(raw[12:16],'little');offset=28+json_length+v.get('byteOffset',0)
    return raw[offset:offset+v['byteLength']]
hp=doc['meshes'][0]['primitives'][0];ep=enemy['meshes'][0]['primitives'][0]
for attribute in ['POSITION','TEXCOORD_0','JOINTS_0','WEIGHTS_0']:
    assert accessor_bytes(raw,doc,hp['attributes'][attribute])==accessor_bytes(other,enemy,ep['attributes'][attribute]),attribute
assert accessor_bytes(raw,doc,hp['indices'])==accessor_bytes(other,enemy,ep['indices'])
assert (root/'public/models/wei-infantry/infantry-basecolor.png').read_bytes()!=(root/'public/models/wei-infantry/infantry-enemy-basecolor.png').read_bytes()
assert set(a['name'] for a in enemy['animations'])==set(a['name'] for a in doc['animations'])
print('PASS: <3600 triangles, exact approved body, connected mesh, blended weights, packed faction textures, six clips, identical faction mesh/UV/skin')
