"""AWS DMS: two database drums linked by a bridge carrying data across."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def drum(m, x, z, mat):
    for k in range(3):
        m.cyl(0.18, 0.11, (x, 0.05, z + 0.06 + k * 0.125), mat if k != 1 else "steel", verts=24, bevel=0.015)
        m.cyl(0.182, 0.012, (x, 0.05, z + 0.12 + k * 0.125), "accent", verts=24, bevel=0)


def build():
    m = Model("dms", accent="#01A88D")
    base = m.plinth()
    z = base
    drum(m, -0.3, z, "steel_light")
    drum(m, 0.3, z, "white")
    # Bridge between them.
    m.box((0.36, 0.14, 0.04), (0, 0.05, z + 0.3), "steel", bevel=0.01)
    for x in (-0.1, 0.1):
        m.box((0.03, 0.03, 0.12), (x, -0.02, z + 0.36), "steel_light", bevel=0.005)
        m.box((0.03, 0.03, 0.12), (x, 0.12, z + 0.36), "steel_light", bevel=0.005)
    m.box((0.36, 0.02, 0.02), (0, -0.02, z + 0.42), "steel_light", bevel=0)
    m.box((0.36, 0.02, 0.02), (0, 0.12, z + 0.42), "steel_light", bevel=0)
    # Records crossing and an arrow.
    bob = m.group("bob_record", (0, 0.05, z + 0.36))
    m.box((0.08, 0.08, 0.06), (0, 0.05, z + 0.36), "accent", bevel=0.01, group=bob)
    arrow = [(-0.12, 0.03), (0.04, 0.03), (0.04, 0.07), (0.12, 0.0), (0.04, -0.07), (0.04, -0.03), (-0.12, -0.03)]
    m.prism(arrow, 0.02, (0, -0.25, z + 0.18), "accent_glow", bevel=0)
    m.box((0.3, 0.06, 0.12), (0, -0.2, z + 0.06), "steel", bevel=0.012)
    m.badge((-0.3, -0.135, z + 0.2), size=0.12)
    m.led((0.3, -0.135, z + 0.2))
    m.socket("status", (0, 0, z + 0.85))
    m.socket("label", (0, 0, z + 0.8))
    return m


if __name__ == "__main__":
    run(build)
