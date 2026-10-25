"""AWS CloudTrail: an audit printer feeding a paper trail between two reels."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("cloudtrail", accent="#E7157B")
    base = m.plinth()
    z = base
    m.box((0.56, 0.46, 0.36), (0, 0.1, z + 0.18), "white", bevel=0.03)
    m.box((0.58, 0.48, 0.05), (0, 0.1, z + 0.385), "accent", bevel=0.015)
    m.box((0.4, 0.03, 0.03), (0, -0.14, z + 0.3), "vent", bevel=0)
    m.badge((-0.14, -0.132, z + 0.15), size=0.13)
    m.led((0.16, -0.132, z + 0.2))
    m.box((0.12, 0.02, 0.06), (0.14, -0.132, z + 0.11), "screen", bevel=0)
    # Paper ribbon from the slot, out and over the floor, onto a reel.
    paper = [(0, -0.15, z + 0.3), (0, -0.28, z + 0.2), (0, -0.36, z + 0.06), (0, -0.44, z + 0.02)]
    for x in (-0.12, 0.0, 0.12):
        m.tube([(x + p[0], p[1], p[2]) for p in paper], 0.012, "white")
    for x in (-0.12, 0.0, 0.12):
        for k in range(1, 3):
            p = paper[k]
            m.box((0.03, 0.01, 0.006), (x, p[1] - 0.006, p[2] + 0.01), "steel", bevel=0)
    # Reels on top.
    for x in (-0.16, 0.16):
        m.cyl(0.025, 0.08, (x, 0.12, z + 0.45), "steel", verts=10)
        spin = m.group("spin_reel" + ("L" if x < 0 else "R"), (x, 0.12, z + 0.5))
        m.cyl(0.12, 0.05, (x, 0.12, z + 0.52), "steel_light", verts=24, bevel=0.008, group=spin)
        m.cyl(0.09, 0.055, (x, 0.12, z + 0.52), "white", verts=24, bevel=0, group=spin)
        m.box((0.2, 0.02, 0.06), (x, 0.12, z + 0.52), "accent_dark", bevel=0, group=spin)
    m.socket("status", (0, 0, z + 0.9))
    m.socket("label", (0, 0, z + 0.85))
    return m


if __name__ == "__main__":
    run(build)
