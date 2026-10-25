"""Transit Gateway: a central hub with spokes out to four network posts."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("tgw", accent="#8C4FFF")
    base = m.plinth()
    z = base
    m.cyl(0.24, 0.16, (0, 0, z + 0.08), "steel", verts=24, bevel=0.025)
    m.cyl(0.2, 0.18, (0, 0, z + 0.25), "accent", verts=24, radius2=0.14, bevel=0.02)
    m.sphere(0.13, (0, 0, z + 0.36), "accent_glow", segments=20, rings=10, scale=(1, 1, 0.7))
    spin = m.group("spin_ring", (0, 0, z + 0.36))
    m.torus(0.2, 0.014, (0, 0, z + 0.36), "steel_light", major_segments=32, minor_segments=6, group=spin)
    for k in range(4):
        a = math.radians(45 + k * 90)
        x, y = 0.4 * math.cos(a), 0.4 * math.sin(a)
        m.tube([(0.18 * math.cos(a), 0.18 * math.sin(a), z + 0.2), (x * 0.7, y * 0.7, z + 0.24), (x, y, z + 0.18)], 0.025, "steel_light")
        m.cyl(0.07, 0.3, (x, y, z + 0.15), "steel", verts=12, bevel=0.012)
        m.cyl(0.075, 0.03, (x, y, z + 0.31), "accent", verts=12, bevel=0.006)
        m.led((x, y - 0.075, z + 0.2), size=0.025)
    m.badge((0, -0.243, z + 0.08), size=0.1)
    m.socket("status", (0, 0, z + 0.75))
    m.socket("label", (0, 0, z + 0.7))
    return m


if __name__ == "__main__":
    run(build)
