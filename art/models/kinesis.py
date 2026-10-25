"""Amazon Kinesis: parallel stream lanes of records flowing through a gateway ring."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("kinesis", accent="#8C4FFF")
    base = m.plinth()
    z = base
    # Three shard lanes.
    for i, y in enumerate((-0.25, 0.05, 0.35)):
        m.box((1.0, 0.16, 0.05), (0, y, z + 0.025), "bezel", bevel=0.01)
        m.box((0.96, 0.02, 0.012), (0, y - 0.06, z + 0.056), "accent_glow", bevel=0)
        for j in range(4):
            x = -0.38 + j * 0.24 + (i * 0.08)
            m.box((0.1, 0.1, 0.07), (x, y, z + 0.09), "accent" if (i + j) % 2 else "white", bevel=0.012)
    # Gateway ring the lanes pass through.
    m.torus(0.52, 0.045, (0.05, 0.05, z + 0.12), "steel_light", rot=(0, 90, 0), major_segments=36, minor_segments=8)
    m.box((0.12, 1.1, 0.1), (0.05, 0.05, z + 0.05), "steel", bevel=0.015)
    spin = m.group("spin_ring", (0.05, 0.05, z + 0.12))
    for k in range(6):
        a = math.radians(k * 60)
        m.box((0.03, 0.04, 0.04), (0.05, 0.05 + 0.52 * math.cos(a), z + 0.12 + 0.52 * math.sin(a)), "accent_glow", bevel=0, group=spin)
    m.box((0.2, 0.06, 0.22), (-0.32, -0.38, z + 0.11), "steel", bevel=0.015)
    m.badge((-0.32, -0.412, z + 0.12), size=0.14)
    m.led((-0.22, -0.412, z + 0.18), size=0.025)
    m.socket("status", (0, 0, z + 1.0))
    m.socket("label", (0, 0, z + 0.95))
    return m


if __name__ == "__main__":
    run(build)
