"""Amazon SQS: a conveyor belt queueing parcels between producers and consumers."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("sqs", accent="#E7157B")
    base = m.plinth()
    z = base
    # Legs and belt frame.
    for x in (-0.4, 0.4):
        for y in (-0.12, 0.2):
            m.box((0.05, 0.05, 0.26), (x, y, z + 0.13), "steel", bevel=0.008)
    m.box((1.0, 0.4, 0.06), (0, 0.04, z + 0.29), "steel", bevel=0.015)
    m.box((0.96, 0.34, 0.02), (0, 0.04, z + 0.33), "rubber", bevel=0.004)
    for x in (-0.48, 0.48):
        m.cyl(0.05, 0.38, (x, 0.04, z + 0.3), "steel_light", verts=14, rot=(90, 0, 0))
    for side in (-0.15, 0.23):
        m.box((1.0, 0.02, 0.05), (0, side, z + 0.34), "accent", bevel=0.006)
    # Parcels in line.
    sizes = [(0.18, 0.18, 0.14), (0.16, 0.2, 0.16), (0.2, 0.18, 0.12), (0.16, 0.16, 0.16)]
    for i, (w, d, h) in enumerate(sizes):
        x = -0.33 + i * 0.22
        m.box((w, d, h), (x, 0.04, z + 0.34 + h / 2), "white" if i % 2 else "accent", bevel=0.015)
        m.box((w + 0.004, 0.03, h + 0.004), (x, 0.04, z + 0.34 + h / 2), "accent_dark" if i % 2 == 0 else "steel_light", bevel=0)
    # Control box with badge.
    m.box((0.26, 0.12, 0.2), (0.3, -0.21, z + 0.1), "steel", bevel=0.015)
    m.badge((0.24, -0.272, z + 0.11), size=0.11)
    m.led((0.38, -0.272, z + 0.14))
    m.socket("status", (0, 0, z + 0.85))
    m.socket("label", (0, 0, z + 0.8))
    return m


if __name__ == "__main__":
    run(build)
