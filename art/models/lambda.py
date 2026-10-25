"""AWS Lambda: a compact function dock with a floating lambda core."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


LAMBDA = [(-0.13, 0.2), (-0.03, 0.2), (0.15, -0.2), (0.07, -0.2), (0.0, -0.04), (-0.08, -0.2),
          (-0.16, -0.2), (-0.04, 0.07), (-0.08, 0.15), (-0.13, 0.15)]


def build():
    m = Model("lambda", accent="#ED7100")
    base = m.plinth()
    z = base
    # Hexagonal dock with vents and an emitter ring.
    m.cyl(0.42, 0.2, (0, 0, z + 0.1), "steel", verts=6, bevel=0.03)
    m.cyl(0.36, 0.04, (0, 0, z + 0.22), "bezel", verts=6, bevel=0.01)
    m.cyl(0.24, 0.03, (0, 0, z + 0.25), "accent_glow", verts=32, bevel=0)
    for k in range(6):
        a = math.radians(k * 60 + 30)
        m.box((0.18, 0.02, 0.07), (0.36 * math.cos(a), 0.36 * math.sin(a), z + 0.1), "vent", bevel=0, rot=(0, 0, k * 60 + 30 + 90))
    m.badge((0, -0.37, z + 0.1), size=0.12)
    # Floating lambda inside a ring.
    core = m.group("bob_core", (0, 0, z + 0.62))
    m.prism([(x * 1.5, zz * 1.5) for x, zz in LAMBDA], 0.08, (0, 0, z + 0.62), "accent", bevel=0.012, group=core)
    m.torus(0.36, 0.022, (0, 0, z + 0.62), "accent_glow", rot=(90, 0, 0), major_segments=40, minor_segments=8, group=core)
    m.socket("status", (0, 0, z + 1.1))
    m.socket("label", (0, 0, z + 1.05))
    return m


if __name__ == "__main__":
    run(build)
