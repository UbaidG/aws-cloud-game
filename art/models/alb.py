"""Elastic Load Balancing: a 2U switching appliance that fans traffic out to three targets."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("alb", accent="#8C4FFF")
    base = m.plinth()
    # Pedestal.
    m.box((0.5, 0.36, 0.22), (0, 0.04, base + 0.11), "steel", bevel=0.03)
    z = base + 0.22
    W, D, H = 0.98, 0.62, 0.3
    m.box((W, D, H), (0, 0.02, z + H / 2), "bezel", bevel=0.03)
    m.box((W + 0.02, D + 0.02, 0.05), (0, 0.02, z + H + 0.02), "accent", bevel=0.02)
    front = -D / 2 + 0.01
    # Two rows of eight network ports with link LEDs.
    for row in range(2):
        pz = z + 0.09 + row * 0.11
        for i in range(8):
            px = -0.1 + i * 0.065
            m.box((0.05, 0.03, 0.045), (px, front - 0.012, pz), "vent", bevel=0)
            m.led((px - 0.013, front - 0.03, pz + 0.032), size=0.012)
    m.badge((-0.33, front - 0.03, z + 0.15), size=0.2)
    # Distributor on top: a hub with three arms that slowly turns.
    top = z + H + 0.045
    import math
    m.cyl(0.17, 0.07, (0, 0.02, top + 0.035), "steel_light", verts=32)
    spin = m.group("spin_hub", (0, 0.02, top + 0.07))
    m.cyl(0.1, 0.14, (0, 0.02, top + 0.14), "accent_glow", verts=24, group=spin)
    m.cyl(0.115, 0.03, (0, 0.02, top + 0.22), "steel_light", verts=24, group=spin)
    for k in range(3):
        a = math.radians(90 + k * 120)
        x, y = 0.3 * math.cos(a), 0.02 + 0.3 * math.sin(a)
        m.box((0.3, 0.07, 0.055), (x / 2, (0.02 + y) / 2, top + 0.12), "accent", bevel=0.015, rot=(0, 0, math.degrees(a)), group=spin)
        m.cyl(0.06, 0.08, (x, y, top + 0.12), "steel_light", verts=16, group=spin)
        m.cyl(0.035, 0.085, (x, y, top + 0.125), "accent_glow", verts=12, bevel=0, group=spin)
    # Three cables fanning out of the back.
    for dx in (-0.3, 0, 0.3):
        m.tube([(dx * 0.6, D / 2 + 0.02, z + 0.15), (dx, D / 2 + 0.16, z + 0.05), (dx * 1.25, D / 2 + 0.2, base + 0.02)], 0.022, "cable")
    m.socket("status", (0, 0, top + 0.4))
    m.socket("label", (0, 0, top + 0.36))
    return m


if __name__ == "__main__":
    run(build)
