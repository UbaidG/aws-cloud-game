"""Elastic Beanstalk: a server in a planter, with a beanstalk climbing out of it."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("beanstalk", accent="#ED7100")
    base = m.plinth()
    z = base
    # Planter box with soil.
    m.box((0.82, 0.62, 0.3), (0, 0.04, z + 0.15), "accent", bevel=0.03)
    m.box((0.74, 0.54, 0.02), (0, 0.04, z + 0.29), "soil", bevel=0)
    for x in (-0.28, 0.28):
        m.box((0.03, 0.64, 0.3), (x, 0.04, z + 0.15), "accent_dark", bevel=0.006)
    m.badge((0, -0.272, z + 0.15), size=0.18)
    # A small app server planted in it.
    m.box((0.3, 0.26, 0.24), (0.18, 0.12, z + 0.42), "steel", bevel=0.02)
    m.vents((0.18, -0.015, z + 0.42), 0.2, 0.1, 5)
    m.led((0.29, -0.02, z + 0.5), size=0.02)
    # Spiralling stalk with leaves.
    pts = []
    for i in range(10):
        t = i / 9
        a = t * math.pi * 3
        pts.append((-0.18 + 0.1 * math.cos(a), 0.0 + 0.1 * math.sin(a), z + 0.3 + t * 0.85))
    m.tube(pts, 0.03, "leaf")
    for i in (2, 4, 6, 8):
        x, y, zz = pts[i]
        a = math.atan2(y, x + 0.18)
        m.sphere(0.07, (x + 0.07 * math.cos(a), y + 0.07 * math.sin(a), zz), "leaf", segments=12, rings=6, scale=(1.6, 0.9, 0.35))
    m.sphere(0.05, pts[-1], "leaf", segments=12, rings=6)
    m.socket("status", (0, 0, z + 1.35))
    m.socket("label", (0, 0, z + 1.3))
    return m


if __name__ == "__main__":
    run(build)
