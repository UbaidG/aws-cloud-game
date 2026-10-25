"""Amazon Route 53: a lattice radio mast with a turning dish that answers DNS lookups."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("route53", accent="#8C4FFF")
    base = m.plinth()
    z = base
    m.box((0.6, 0.6, 0.1), (0, 0, z + 0.05), "steel", bevel=0.02)
    # Tapered four-legged lattice.
    top = z + 1.0
    legs = [(-0.24, -0.24), (0.24, -0.24), (0.24, 0.24), (-0.24, 0.24)]
    for x, y in legs:
        m.tube([(x, y, z + 0.1), (x * 0.25, y * 0.25, top)], 0.018, "steel_light")
    for t in (0.3, 0.6):
        s = 1 - 0.75 * t
        zz = z + 0.1 + t * (top - z - 0.1)
        for i in range(4):
            (x1, y1), (x2, y2) = legs[i], legs[(i + 1) % 4]
            m.tube([(x1 * s, y1 * s, zz), (x2 * s, y2 * s, zz + 0.12)], 0.01, "accent")
    m.box((0.18, 0.18, 0.05), (0, 0, top), "steel", bevel=0.01)
    # Dish, turning on its mast.
    spin = m.group("spin_dish", (0, 0, top))
    m.cyl(0.03, 0.15, (0, 0, top + 0.08), "steel_light", verts=10, group=spin)
    m.cyl(0.22, 0.09, (0, -0.06, top + 0.22), "white", radius2=0.06, verts=28, bevel=0.006, rot=(-70, 0, 0), group=spin)
    m.cyl(0.012, 0.18, (0, -0.15, top + 0.25), "steel_light", verts=8, bevel=0, rot=(-70, 0, 0), group=spin)
    m.sphere(0.03, (0, -0.24, top + 0.28), "accent_glow", segments=10, rings=6, group=spin)
    # Equipment hut with the badge.
    m.box((0.3, 0.22, 0.2), (0.0, -0.2, z + 0.2), "accent", bevel=0.02)
    m.badge((0, -0.312, z + 0.2), size=0.13)
    m.socket("status", (0, 0, top + 0.5))
    m.socket("label", (0, 0, top + 0.45))
    return m


if __name__ == "__main__":
    run(build)
