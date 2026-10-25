"""
CloudCraft model kit for headless Blender.

Every model script under `art/models/` builds its hardware with this kit, then calls
`Model.finish()`, which:

1. joins parts into one mesh per (group, material), so each model costs a handful of draw calls,
2. unwraps every bakeable mesh into one shared UV atlas and bakes ambient occlusion into it
   with Cycles (exported as the glTF occlusion texture, so corners look grounded in-game),
3. exports `<out>/<name>.glb` (Y-up; Blender's -Y "front" becomes the game's +Z, facing the camera),
4. writes `<out>/<name>.json` with height, footprint, triangle count, sockets and parts,
5. optionally renders a preview PNG.

Conventions:
- 1 Blender unit = 1 world unit. The footprint fits in 1.1 x 1.1 (a board tile is 1.4).
- Origin at the base centre; models stand on Z = 0; the front faces -Y.
- Materials come from `art/palette.json` and are named `cc_<name>`. The game swaps each for a
  shared material built from the same values, so colour is tuned once, in-game.
- Named nodes the game drives: `socket_*` (empties: status light, label anchor), `led` meshes
  (health colour), `spin_*` groups (rotate about local Y in-game), `heat_*` groups (overload glow),
  `badge` meshes (the service icon texture is applied at runtime).
"""

import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Euler, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
PALETTE = json.load(open(os.path.join(HERE, "..", "palette.json")))

# Materials that are not ambient-occlusion baked (emissive, transparent or runtime-textured).
NO_BAKE = {"badge", "led", "screen", "glow", "glass", "accent_glow"}


def _srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(_srgb_to_linear(int(h[i : i + 2], 16) / 255) for i in (0, 2, 4))


def darker(h, f=0.55):
    h = h.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return "#%02x%02x%02x" % (int(r * f), int(g * f), int(b * f))


class Model:
    def __init__(self, name, accent="#ED7100"):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        self.name = name
        self.accent = accent
        self.scene = bpy.context.scene
        self.materials = {}
        self.root = self._empty(name, (0, 0, 0))
        self.groups = {"": self.root}
        self.sockets = {}
        self.ao_size = 384

    # ------------------------------------------------------------------ materials

    def mat(self, key):
        if key in self.materials:
            return self.materials[key]
        spec = dict(PALETTE[key])
        if key == "accent":
            spec["color"] = self.accent
        elif key == "accent_dark":
            spec["color"] = darker(self.accent)
        elif key == "accent_glow":
            spec["color"] = spec["emissive"] = self.accent
        m = bpy.data.materials.new("cc_" + key)
        m.use_nodes = True
        bsdf = m.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = (*hex_rgb(spec["color"]), 1)
        bsdf.inputs["Metallic"].default_value = spec.get("metal", 0)
        bsdf.inputs["Roughness"].default_value = spec.get("rough", 0.5)
        if "emissive" in spec:
            bsdf.inputs["Emission Color"].default_value = (*hex_rgb(spec["emissive"]), 1)
            bsdf.inputs["Emission Strength"].default_value = spec.get("emissiveIntensity", 1)
        if "opacity" in spec:
            bsdf.inputs["Alpha"].default_value = spec["opacity"]
            m.surface_render_method = "BLENDED"
        self.materials[key] = m
        return m

    # ------------------------------------------------------------------ structure

    def _empty(self, name, loc, parent=None):
        e = bpy.data.objects.new(name, None)
        e.location = loc
        self.scene.collection.objects.link(e)
        if parent is not None:
            e.parent = parent
        return e

    def group(self, name, pivot=(0, 0, 0)):
        """A named sub-assembly (e.g. `spin_dish`). Parts added with `group=name` sit under it,
        positioned in model space; the group's origin is the pivot it animates around."""
        assert name.startswith(("spin_", "heat_", "bob_")), name
        self.groups[name] = self._empty(name, pivot, self.root)
        return name

    def socket(self, name, loc):
        self.sockets[name] = loc
        self._empty("socket_" + name, loc, self.root)

    def _finish_part(self, o, mat, group, name, smooth_angle=35):
        o.name = name or mat
        o.data.materials.clear()
        o.data.materials.append(self.mat(mat))
        o["cc_group"] = group
        o["cc_mat"] = mat
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        if smooth_angle is None:
            bpy.ops.object.shade_flat()
        else:
            bpy.ops.object.shade_smooth_by_angle(angle=math.radians(smooth_angle))
        o.select_set(False)
        return o

    def _apply_bevel(self, o, width, segments):
        if width <= 0:
            return
        mod = o.modifiers.new("bevel", "BEVEL")
        mod.width = width
        mod.segments = segments
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(40)
        mod.harden_normals = True
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier="bevel")

    def _place(self, o, loc, rot):
        o.location = loc
        if rot:
            o.rotation_euler = Euler([math.radians(a) for a in rot])
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        o.select_set(False)

    # ------------------------------------------------------------------ primitives

    def box(self, size, loc, mat, bevel=0.02, segments=1, rot=None, group="", name=None):
        bpy.ops.mesh.primitive_cube_add(size=1)
        o = bpy.context.object
        o.scale = size
        self._place(o, loc, rot)
        self._apply_bevel(o, min(bevel, min(size) * 0.45), segments)
        return self._finish_part(o, mat, group, name)

    def cyl(self, radius, depth, loc, mat, verts=24, bevel=0.012, segments=1, rot=None, radius2=None, group="", name=None):
        """Cylinder along Z (or a cone/frustum when `radius2` is given)."""
        if radius2 is None:
            bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth)
        else:
            bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=radius, radius2=radius2, depth=depth)
        o = bpy.context.object
        self._place(o, loc, rot)
        self._apply_bevel(o, min(bevel, depth * 0.45), segments)
        return self._finish_part(o, mat, group, name)

    def sphere(self, radius, loc, mat, segments=24, rings=12, scale=(1, 1, 1), group="", name=None):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius)
        o = bpy.context.object
        o.scale = scale
        self._place(o, loc, None)
        return self._finish_part(o, mat, group, name, smooth_angle=180)

    def torus(self, major, minor, loc, mat, rot=None, major_segments=40, minor_segments=10, group="", name=None):
        bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=major_segments, minor_segments=minor_segments)
        o = bpy.context.object
        self._place(o, loc, rot)
        return self._finish_part(o, mat, group, name, smooth_angle=180)

    def prism(self, points, depth, loc, mat, bevel=0.01, rot=None, group="", name=None):
        """Extrude a 2D outline (XZ plane points, front-facing) by `depth` along Y."""
        mesh = bpy.data.meshes.new("prism")
        bm = bmesh.new()
        verts = [bm.verts.new((x, -depth / 2, z)) for x, z in points]
        face = bm.faces.new(verts)
        bmesh.ops.recalc_face_normals(bm, faces=[face])
        res = bmesh.ops.extrude_face_region(bm, geom=[face])
        moved = [v for v in res["geom"] if isinstance(v, bmesh.types.BMVert)]
        bmesh.ops.translate(bm, verts=moved, vec=(0, depth, 0))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(mesh)
        bm.free()
        o = bpy.data.objects.new("prism", mesh)
        self.scene.collection.objects.link(o)
        self._place(o, loc, rot)
        self._apply_bevel(o, bevel, 2)
        return self._finish_part(o, mat, group, name, smooth_angle=30)

    def tube(self, points, radius, mat, bevel_res=4, group="", name=None):
        """A cable/pipe through 3D points (smooth curve converted to mesh)."""
        curve = bpy.data.curves.new("tube", "CURVE")
        curve.dimensions = "3D"
        curve.bevel_depth = radius
        curve.bevel_resolution = 1
        curve.resolution_u = bevel_res
        spline = curve.splines.new("BEZIER")
        spline.bezier_points.add(len(points) - 1)
        for bp, p in zip(spline.bezier_points, points):
            bp.co = p
            bp.handle_left_type = bp.handle_right_type = "AUTO"
        curve.use_fill_caps = True
        o = bpy.data.objects.new("tube", curve)
        self.scene.collection.objects.link(o)
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        bpy.ops.object.convert(target="MESH")
        o = bpy.context.object
        o.select_set(False)
        return self._finish_part(o, mat, group, name, smooth_angle=60)

    # ------------------------------------------------------------------ details

    def badge(self, loc, size=0.34, facing="front", group=""):
        """Plane for the service icon (textured in-game). `facing`: front (-Y), top (+Z), right (+X)."""
        bpy.ops.mesh.primitive_plane_add(size=1)
        o = bpy.context.object
        o.scale = (size, size, 1)
        rot = {"front": (90, 0, 0), "top": None, "right": (90, 0, 90), "left": (90, 0, -90)}[facing]
        self._place(o, loc, rot)
        return self._finish_part(o, "badge", group, "badge", smooth_angle=None)

    def led(self, loc, size=0.035, facing="front", group=""):
        d = 0.012
        dims = {"front": (size, d, size), "top": (size, size, d), "right": (d, size, size), "left": (d, size, size)}[facing]
        return self.box(dims, loc, "led", bevel=0, group=group, name="led")

    def vents(self, center, width, height, count, mat="vent", depth=0.02, facing="front", gap=0.35, group=""):
        """A row of vertical slots on a face."""
        cx, cy, cz = center
        slot = width / count
        for i in range(count):
            off = -width / 2 + slot * (i + 0.5)
            if facing == "front":
                self.box((slot * (1 - gap), depth, height), (cx + off, cy, cz), mat, bevel=0, group=group)
            else:
                self.box((depth, slot * (1 - gap), height), (cx, cy + off, cz), mat, bevel=0, group=group)

    def screws(self, points, mat="steel_light", r=0.016, facing="front", group=""):
        rot = {"front": (90, 0, 0), "top": None}[facing]
        for p in points:
            self.cyl(r, 0.012, p, mat, verts=8, bevel=0, rot=rot, group=group)

    def plinth(self, w=1.08, d=1.08, h=0.07, mat="concrete"):
        """Standard base every model sits on, so they read as one family on the board."""
        self.box((w, d, h), (0, 0, h / 2), mat, bevel=0.025, segments=2)
        self.box((w - 0.08, d - 0.08, 0.012), (0, 0, h + 0.006), "rubber", bevel=0)
        return h + 0.012

    # ------------------------------------------------------------------ finish

    def _parts(self):
        return [o for o in self.scene.objects if o.type == "MESH" and "cc_mat" in o]

    def _join(self, objs, name):
        if len(objs) == 1:
            objs[0].name = name
            return objs[0]
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.join()
        o = bpy.context.object
        o.name = name
        return o

    def _bake_ao(self, objs):
        scene = self.scene
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 96
        scene.render.bake.margin = 4
        # Shared atlas: multi-object smart UV projection packs every island into one 0..1 square.
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.012, scale_to_bounds=True)
        bpy.ops.object.mode_set(mode="OBJECT")

        img = bpy.data.images.new(self.name + "_ao", self.ao_size, self.ao_size, alpha=False)
        img.colorspace_settings.name = "Non-Color"
        group = self._gltf_output_group()
        for key, m in self.materials.items():
            if key in NO_BAKE:
                continue
            nodes, links = m.node_tree.nodes, m.node_tree.links
            tex = nodes.new("ShaderNodeTexImage")
            tex.image = img
            nodes.active = tex
            sep = nodes.new("ShaderNodeSeparateColor")
            links.new(tex.outputs["Color"], sep.inputs["Color"])
            out = nodes.new("ShaderNodeGroup")
            out.node_tree = group
            links.new(sep.outputs["Red"], out.inputs["Occlusion"])
        # A floor so the base picks up contact occlusion, removed after baking.
        bpy.ops.mesh.primitive_plane_add(size=6)
        floor = bpy.context.object
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.bake(type="AO", margin=4, use_clear=True)
        bpy.data.objects.remove(floor)
        # Lift the darkest values a little: in-game AO multiplies with the environment light.
        px = list(img.pixels)
        for i in range(0, len(px), 4):
            v = 0.25 + 0.75 * px[i]
            px[i] = px[i + 1] = px[i + 2] = v
        img.pixels = px
        img.pack()

    def _gltf_output_group(self):
        name = "glTF Material Output"
        if name in bpy.data.node_groups:
            return bpy.data.node_groups[name]
        g = bpy.data.node_groups.new(name, "ShaderNodeTree")
        g.interface.new_socket(name="Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
        g.nodes.new("NodeGroupInput")
        return g

    def finish(self, out_dir, preview=False):
        os.makedirs(out_dir, exist_ok=True)
        parts = self._parts()
        # 1. Join by (group, material).
        buckets = {}
        for o in parts:
            buckets.setdefault((o["cc_group"], o["cc_mat"]), []).append(o)
        joined = []
        for (group, mat), objs in buckets.items():
            o = self._join(objs, f"{group or 'body'}.{mat}")
            o["cc_group"], o["cc_mat"] = group, mat
            joined.append(o)
        # Parent into groups, keeping world transforms.
        for o in joined:
            g = self.groups[o["cc_group"]]
            mw = o.matrix_world.copy()
            o.parent = g
            o.matrix_world = mw
        # 2. Bake AO.
        bakeable = [o for o in joined if o["cc_mat"] not in NO_BAKE]
        if bakeable:
            self._bake_ao(bakeable)
        # 3. Stats.
        tris = 0
        zmax = 0.0
        xs, ys = [], []
        dg = bpy.context.evaluated_depsgraph_get()
        for o in joined:
            me = o.evaluated_get(dg).to_mesh()
            me.calc_loop_triangles()
            tris += len(me.loop_triangles)
            for v in me.vertices:
                w = o.matrix_world @ v.co
                zmax = max(zmax, w.z)
                xs.append(w.x)
                ys.append(w.y)
            o.evaluated_get(dg).to_mesh_clear()
        # 4. Export (model only).
        bpy.ops.object.select_all(action="DESELECT")
        for o in self.scene.objects:
            if o == self.root or o.parent is not None:
                o.select_set(True)
        path = os.path.join(out_dir, self.name + ".glb")
        bpy.ops.export_scene.gltf(
            filepath=path,
            use_selection=True,
            export_yup=True,
            export_apply=True,
            export_image_format="WEBP",
            export_image_quality=75,
            export_extras=False,
            export_animations=False,
        )
        to_yup = lambda p: [round(p[0], 4), round(p[2], 4), round(-p[1], 4)]
        meta = {
            "name": self.name,
            "accent": self.accent,
            "height": round(zmax, 4),
            "footprint": [round(max(xs) - min(xs), 3), round(max(ys) - min(ys), 3)],
            "triangles": tris,
            "sockets": {k: to_yup(v) for k, v in self.sockets.items()},
            "groups": [g for g in self.groups if g],
            "bytes": os.path.getsize(path),
        }
        json.dump(meta, open(os.path.join(out_dir, self.name + ".json"), "w"), indent=1)
        if preview:
            self.render_preview(os.path.join(out_dir, self.name + ".png"))
        print("CC_DONE", json.dumps(meta))
        return meta

    def render_preview(self, path, size=512):
        scene = self.scene
        scene.render.engine = "BLENDER_EEVEE"
        # Show the AO in the preview the way the game will: multiply into base colour is not exact,
        # but the shape and contact shading read correctly.
        cam_data = bpy.data.cameras.new("cam")
        cam_data.lens = 70
        cam = bpy.data.objects.new("cam", cam_data)
        scene.collection.objects.link(cam)
        # Same three-quarter view as the board camera.
        target = Vector((0, 0, 0.6))
        cam.location = target + Vector((2.3, -3.6, 2.6))
        cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.camera = cam
        for loc, energy, sz in (((2.5, -2.5, 4.5), 500, 3), ((-3.5, -1, 2.5), 160, 3), ((0, 3, 3), 220, 2)):
            ld = bpy.data.lights.new("l", "AREA")
            ld.energy = energy
            ld.size = sz
            lo = bpy.data.objects.new("l", ld)
            lo.location = loc
            lo.rotation_euler = (Vector((0, 0, 0.5)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
            scene.collection.objects.link(lo)
        world = bpy.data.worlds.new("w")
        scene.world = world
        world.use_nodes = True
        world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.03, 0.04, 0.06, 1)
        world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
        bpy.ops.mesh.primitive_plane_add(size=8)
        floor = bpy.context.object
        floor.data.materials.append(self.mat("concrete"))
        scene.render.resolution_x = scene.render.resolution_y = size
        scene.render.film_transparent = False
        scene.view_settings.view_transform = "AgX"
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)


def run(build):
    """Entry point for model scripts: `blender -b -P model.py -- <out_dir> [--preview]`."""
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    out_dir = argv[0] if argv else os.path.join(HERE, "..", "..", "public", "models")
    model = build()
    model.finish(out_dir, preview="--preview" in argv)
