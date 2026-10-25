"""Amazon S3: a reinforced steel bucket filled with object blocks."""
import math
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("s3", accent="#7AA116")
    base = m.plinth()
    z = base
    # Bucket: a frustum with banding and a rolled rim.
    h = 0.78
    m.cyl(0.36, h, (0, 0, z + h / 2), "steel", radius2=0.46, verts=40, bevel=0.02)
    for t in (0.18, 0.55):
        rr = 0.36 + 0.1 * t
        m.torus(rr + 0.012, 0.022, (0, 0, z + h * t), "accent", major_segments=40, minor_segments=8)
    m.torus(0.465, 0.03, (0, 0, z + h), "steel_light", major_segments=40, minor_segments=8)
    m.cyl(0.43, 0.04, (0, 0, z + h - 0.06), "bezel", verts=40, bevel=0)
    # Objects inside, poking out of the top.
    objs = [(-0.17, -0.1, 0.21, "white"), (0.13, -0.15, 0.18, "accent"), (0.16, 0.14, 0.22, "white"),
            (-0.13, 0.18, 0.18, "accent_dark"), (0.0, 0.0, 0.26, "steel_light")]
    for x, y, s, mat in objs:
        m.box((s, s, s), (x, y, z + h - 0.04 + s / 2 - 0.02), mat, bevel=0.02, rot=(0, 0, (x + y) * 90))
    # Handle.
    m.torus(0.42, 0.018, (0, 0, z + h), "steel_light", rot=(90, 0, 0), major_segments=32, minor_segments=6)
    m.badge((0, -0.42, z + 0.37), size=0.22, facing="front")
    m.box((0.26, 0.04, 0.26), (0, -0.39, z + 0.37), "bezel", bevel=0.01, rot=(-7, 0, 0))
    m.socket("status", (0, 0, z + h + 0.55))
    m.socket("label", (0, 0, z + h + 0.5))
    return m


if __name__ == "__main__":
    run(build)
