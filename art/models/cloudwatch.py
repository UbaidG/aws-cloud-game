"""Amazon CloudWatch: an ops console with live graphs and a rotating alarm beacon."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("cloudwatch", accent="#E7157B")
    base = m.plinth()
    z = base
    # Console desk.
    m.box((0.8, 0.4, 0.3), (0, 0.12, z + 0.15), "steel", bevel=0.025)
    m.box((0.82, 0.24, 0.04), (0, -0.03, z + 0.31), "bezel", bevel=0.01, rot=(-15, 0, 0))
    for i in range(6):
        m.box((0.08, 0.06, 0.012), (-0.25 + i * 0.1, -0.05, z + 0.335), "steel_light", bevel=0, rot=(-15, 0, 0))
    # Monitor wall: two screens.
    for x in (-0.2, 0.2):
        m.box((0.36, 0.05, 0.28), (x, 0.24, z + 0.55), "bezel", bevel=0.015)
        m.box((0.32, 0.01, 0.24), (x, 0.212, z + 0.55), "screen", bevel=0)
    m.box((0.06, 0.06, 0.2), (0, 0.27, z + 0.38), "steel", bevel=0.01)
    # Graph line on the left screen.
    pts = [(-0.34, 0.205, z + 0.47), (-0.27, 0.205, z + 0.52), (-0.2, 0.205, z + 0.5), (-0.13, 0.205, z + 0.6), (-0.06, 0.205, z + 0.63)]
    m.tube(pts, 0.008, "accent_glow")
    # Bars on the right screen.
    for i, h in enumerate((0.06, 0.12, 0.09, 0.16, 0.11)):
        m.box((0.035, 0.01, h), (0.08 + i * 0.06, 0.205, z + 0.44 + h / 2), "accent_glow", bevel=0)
    # Beacon on top.
    m.cyl(0.07, 0.05, (0, 0.24, z + 0.715), "steel", verts=16)
    m.cyl(0.06, 0.1, (0, 0.24, z + 0.79), "glass", verts=16, bevel=0.01)
    spin = m.group("spin_beacon", (0, 0.24, z + 0.79))
    m.box((0.08, 0.02, 0.05), (0.02, 0.24, z + 0.79), "accent_glow", bevel=0, group=spin)
    m.badge((-0.25, -0.082, z + 0.14), size=0.12)
    m.led((0.28, -0.082, z + 0.14))
    m.socket("status", (0, 0, z + 1.1))
    m.socket("label", (0, 0, z + 1.05))
    return m


if __name__ == "__main__":
    run(build)
