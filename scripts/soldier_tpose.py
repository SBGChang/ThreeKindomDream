"""Rebase the skinned mesh to horizontal arms while preserving animation poses."""
import bpy
from mathutils import Vector, Matrix

def arm_transforms(point):
    result={}
    for s,side in [(-1,'R'),(1,'L')]:
        segments=[('upper_arm',(s*.28,0,1.425),(s*.37,-.005,1.17)),('forearm',(s*.37,-.005,1.17),(s*.41,-.15,.99)),('hand',(s*.41,-.15,.99),(s*.41,-.19,.92))]
        target=point(segments[0][1])
        for name,a,b in segments:
            a,b=point(a),point(b);d=b-a
            r=d.rotation_difference(Vector((s,0,0))).to_matrix().to_4x4()
            result[name+'.'+side]=Matrix.Translation(target)@r@Matrix.Translation(-a)
            target+=Vector((s*d.length,0,0))
    return result

def rebase_tpose(body, rig, clips):
    scene=bpy.context.scene
    snapshots={}
    for name,(action,end) in clips.items():
        rig.animation_data.action=action
        snapshots[name]={}
        for frame in range(1,end+1):
            scene.frame_set(frame)
            snapshots[name][frame]={p.name:p.matrix.copy() for p in rig.pose.bones}
    rig.animation_data.action=None
    for p in rig.pose.bones:p.matrix_basis=Matrix.Identity(4)
    bpy.context.view_layer.update()
    for sign,side in [(-1,'R'),(1,'L')]:
        previous=None
        for prefix in ['upper_arm','forearm','hand']:
            p=rig.pose.bones[prefix+'.'+side]
            rest=p.bone.matrix_local.copy()
            rotation=(rest.to_3x3()@Vector((0,1,0))).rotation_difference(Vector((sign,0,0)))
            target=rotation.to_matrix().to_4x4()@rest
            target.translation=previous.tail.copy() if previous else p.bone.head_local
            p.matrix=target
            bpy.context.view_layer.update()
            previous=p
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True);bpy.context.view_layer.objects.active=body
    # Mesh was constructed and welded in T pose; only rebase the armature.
    body.select_set(False);rig.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.object.mode_set(mode='POSE');bpy.ops.pose.armature_apply(selected=False);bpy.ops.object.mode_set(mode='OBJECT')
    # Parent-first matrix assignment converts old world poses to the new bind pose.
    ordered=sorted(rig.pose.bones,key=lambda p:len(p.parent_recursive))
    for name,(action,end) in list(clips.items()):
        action.name=name+'-old'
        replacement=bpy.data.actions.new(name);rig.animation_data.action=replacement
        for frame,matrices in snapshots[name].items():
            scene.frame_set(frame)
            for p in ordered:
                p.matrix=matrices[p.name]
                bpy.context.view_layer.update()
                p.keyframe_insert('rotation_euler',frame=frame)
                p.keyframe_insert('location',frame=frame)
                p.keyframe_insert('scale',frame=frame)
        for track in rig.animation_data.nla_tracks:
            for strip in track.strips:
                if strip.action==action:strip.action=replacement
        clips[name]=(replacement,end)
        bpy.data.actions.remove(action)
    rig.animation_data.action=clips['Idle'][0];scene.frame_set(1)
