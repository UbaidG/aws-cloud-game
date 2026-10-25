"""Amazon SNS: a pole of loudspeaker horns broadcasting to every subscriber."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("sns", accent="#E7157B")
    base = m.plinth()
    z = base
    m.cyl(0.26, 0.08, (0, 0.05, z + 0.04), "steel", verts=24, bevel=0.015)
    m.cyl(0.035, 0.9, (0, 0.05, z + 0.5), "steel_light", verts=12)
    top = z + 0.82
    m.box((0.14, 0.14, 0.14), (0, 0.05, top), "accent", bevel=0.02)
    spin = m.group("spin_horns", (0, 0.05, top))
    for k in range(4):
        a = k * 90 + 45
        r = math.radians(a)
        dx, dy = math.sin(r), -math.cos(r)
        cx, cy = 0.17 * dx, 0.05 + 0.17 * dy
        # Horn: a cone opening outward, tilted down a little.
        m.cyl(0.03, 0.22, (cx, cy, top - 0.02), "white", radius2=0.11, verts=18, bevel=0.006, rot=(80, 0, a), group=spin)
        m.cyl(0.1, 0.012, (cx + 0.1 * dx, cy + 0.1 * dy, top - 0.04), "accent_glow", verts=18, bevel=0, rot=(80, 0, a), group=spin)
    m.box((0.28, 0.16, 0.28), (0, -0.14, z + 0.22), "steel", bevel=0.02)
    m.badge((0, -0.222, z + 0.24), size=0.14)
    m.led((0.1, -0.222, z + 0.14))
    m.socket("status", (0, 0, top + 0.35))
    m.socket("label", (0, 0, top + 0.3))
    return m


if __name__ == "__main__":
    run(build)
