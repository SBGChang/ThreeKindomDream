"""World-space acting and independent spear animation, baked into all six clips."""
import bpy, math
from mathutils import Vector, Matrix

def refine_motion(body,rig,clips,point,arm_maps):
    scene=bpy.context.scene
    hand_bind=rig.data.bones['hand.R'].matrix_local.copy()
    bind_grip=arm_maps['hand.R']@point((-.42,-.15,.99),weapon=True)
    bind_axis=(arm_maps['hand.R'].to_3x3()@Vector((0,0,1))).normalized()
    bpy.context.view_layer.objects.active=rig
    bpy.ops.object.mode_set(mode='EDIT')
    bone=rig.data.edit_bones.new('spear');bone.matrix=hand_bind;bone.length=.25
    bpy.ops.object.mode_set(mode='OBJECT')
    spear_bind=rig.data.bones['spear'].matrix_local.copy()
    weapon=rig.pose.bones['spear'];weapon.rotation_mode='XYZ'
    group=body.vertex_groups.new(name='spear')
    tagged=[i for i,v in enumerate(body.data.attributes['spear_vertices'].data) if v.value]
    for g in body.vertex_groups:
        if g!=group:g.remove(tagged)
    group.add(tagged,1,'REPLACE')
    def aim(name,direction):
        p=rig.pose.bones[name];m=p.matrix.copy()
        q=(m.to_3x3()@Vector((0,1,0))).rotation_difference(Vector(direction).normalized())
        rotated=q.to_matrix().to_4x4()@m;rotated.translation=m.translation;p.matrix=rotated
        bpy.context.view_layer.update()
    def shift(name,offset,angle=0):
        p=rig.pose.bones[name];m=p.matrix.copy();r=Matrix.Rotation(angle,4,'X')@m
        r.translation=m.translation+Vector(offset);p.matrix=r;bpy.context.view_layer.update()
    ordered=sorted((p for p in rig.pose.bones if p.name!='spear'),key=lambda p:len(p.parent_recursive))
    for name,(action,end) in clips.items():
        rig.animation_data.action=action
        snapshots={}
        for frame in range(1,end+1):
            scene.frame_set(frame);snapshots[frame]={p.name:p.matrix.copy() for p in ordered}
        release=None
        for frame in range(1,end+1):
            scene.frame_set(frame)
            for p in ordered:p.matrix=snapshots[frame][p.name];bpy.context.view_layer.update()
            u=(frame-1)/(end-1);wave=math.sin(u*math.tau);pulse=math.sin(math.pi*u)**2
            if name=='Cheer':
                def smooth(t):
                    t=max(0,min(1,t));return t*t*(3-2*t)
                lift=smooth((u-.12)/.33) if u<.62 else 1-smooth((u-.62)/.33)
                # Bent elbow beside the torso -> outward/upward extension -> return.
                # Use explicit world directions, not the previous salute pose.
                aim('upper_arm.R',Vector((-.45,-.08,-1)).lerp(Vector((-.42,-.05,1)),lift))
                shift('upper_arm.R',(0,0,.12*lift))
                aim('forearm.R',Vector((-.25,-.16,1)).lerp(Vector((-.42,-.05,1)),lift))
                aim('hand.R',(-.2,-.02,1))
            if name=='Hit':
                shift('pelvis',(0,.18*pulse,0))
                shift('chest',(0,.10*pulse,-.06*pulse),.48*pulse)
                # Both hands reach toward the impact, head pitches forward.
                for side in ['L','R']:
                    for segment,target in [('upper_arm',(0,-1,-.30)),('forearm',(0,-1,.12)),('hand',(0,-1,0))]:
                        p=rig.pose.bones[segment+'.'+side];current=(p.matrix.to_3x3()@Vector((0,1,0))).normalized()
                        aim(p.name,current.lerp(Vector(target).normalized(),pulse))
                shift('head',(0,-.22*pulse,-.06*pulse),.40*pulse)
            hand=rig.pose.bones['hand.R']
            grip=hand.matrix@hand_bind.inverted()@bind_grip
            direction=Vector((0,0,1))
            if name=='Run':direction=Vector((0,-.68,.73))
            elif name=='Thrust':direction=Vector((0,-pulse,1-pulse)).normalized()
            elif name=='Hit':direction=Vector((0,-.35*pulse,1)).normalized()
            elif name=='Death':
                if release is None:release=grip.copy()
                if u<.16:release=grip.copy()
                else:
                    t=min(1,(u-.16)/.68)
                    landing=Vector((-.83,-.08,.085))
                    grip=release.lerp(landing,t);grip.z+=.16*math.sin(math.pi*t)
                    direction=Vector((0,-math.sin(t*math.pi/2),math.cos(t*math.pi/2)))
            rotation=bind_axis.rotation_difference(direction.normalized()).to_matrix().to_4x4()
            # A fixed material point on the shaft stays in the palm throughout.
            weapon.matrix=Matrix.Translation(grip)@rotation@Matrix.Translation(-bind_grip)@spear_bind
            bpy.context.view_layer.update()
            for p in rig.pose.bones:
                p.keyframe_insert('rotation_euler',frame=frame);p.keyframe_insert('location',frame=frame);p.keyframe_insert('scale',frame=frame)
    rig.animation_data.action=clips['Idle'][0];scene.frame_set(1)
