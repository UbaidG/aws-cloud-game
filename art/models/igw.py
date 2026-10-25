"""Internet Gateway: the VPC's front door, an arch with doors swung open."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("igw", accent="#8C4FFF")
    base = m.plinth()
    z = base
    m.box((1.0, 0.36, 0.06), (0, 0.06, z + 0.03), "steel", bevel=0.015)
    H = 0.95
    for x in (-0.4, 0.4):
        m.box((0.16, 0.3, H), (x, 0.06, z + H / 2), "steel", bevel=0.025)
        m.box((0.18, 0.32, 0.06), (x, 0.06, z + 0.03), "steel_light", bevel=0.01)
    m.box((0.98, 0.34, 0.16), (0, 0.06, z + H + 0.06), "accent", bevel=0.025)
    m.box((0.6, 0.02, 0.06), (0, -0.115, z + H + 0.06), "accent_glow", bevel=0)
    # Doors swung outward.
    for side in (-1, 1):
        x = side * 0.32
        m.box((0.3, 0.035, 0.78), (x - side * 0.03, -0.12, z + 0.45), "steel_light", bevel=0.012, rot=(0, 0, side * 60))
        m.box((0.18, 0.04, 0.4), (x - side * 0.03, -0.125, z + 0.5), "glass", bevel=0, rot=(0, 0, side * 60))
    # Glowing threshold.
    m.box((0.64, 0.3, 0.012), (0, 0.06, z + 0.066), "accent_glow", bevel=0)
    m.badge((-0.4, -0.092, z + 0.7), size=0.12)
    m.socket("status", (0, 0, z + H + 0.4))
    m.socket("label", (0, 0, z + H + 0.35))
    return m


if __name__ == "__main__":
    run(build)
