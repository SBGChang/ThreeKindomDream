import bpy,sys
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
from soldier_proportions import chibi_point
from soldier_tpose import arm_transforms
rig=bpy.data.objects['Wei_Infantry_Rig'];scene=bpy.context.scene
mapping=arm_transforms(chibi_point)['hand.R']
axis=mapping.to_3x3()@Vector((0,0,1));grip=mapping@chibi_point((-.42,-.15,.99),weapon=True)
bind=rig.data.bones['spear'].matrix_local.inverted()
for name in ['Cheer','Run']:
    rig.animation_data.action=bpy.data.actions[name]
    for f in range(1,int(bpy.data.actions[name].frame_range[1])+1):
        scene.frame_set(f);delta=rig.pose.bones['spear'].matrix@bind;direction=(delta.to_3x3()@axis).normalized()
        if name=='Cheer':
            assert direction.z>.99, (name,f,tuple(direction))
            palm=rig.pose.bones['hand.R'].matrix@rig.data.bones['hand.R'].matrix_local.inverted()@grip
            assert (delta@grip-palm).length<.001,'Cheer grip slips on shaft'
        else:assert direction.y<-.60 and direction.z>.65,(name,f,tuple(direction))
rig.animation_data.action=bpy.data.actions['Cheer'];scene.frame_set(1)
low=(rig.pose.bones['spear'].matrix@bind@grip).copy()
scene.frame_set(21);high=(rig.pose.bones['spear'].matrix@bind@grip).copy()
assert high.z-low.z>.65, 'Cheer needs a visible whole-arm lift'
assert high.z>2.47, ('Hand must rise above head',high.z)
scene.frame_set(40);assert ((rig.pose.bones['spear'].matrix@bind@grip)-low).length<.001,'Cheer loop must return'
rig.animation_data.action=bpy.data.actions['Death'];scene.frame_set(20)
delta=rig.pose.bones['spear'].matrix@bind
assert abs((delta.to_3x3()@axis).z)<.02,'Spear must settle flat'
assert abs((delta@grip).z-.085)<.01,'Spear must land at ground height'
assert (delta@grip-rig.pose.bones['hand.R'].matrix.translation).length>.25,'Spear still attached'
assert bpy.data.actions['Death'].frame_range[1]==20
print('PASS: upward cheer, forward diagonal run, 20-frame death, independent grounded spear')
