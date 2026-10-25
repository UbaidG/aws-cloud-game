"""Amazon EC2: a compact server rack with four 1U sleds, drive bays and status LEDs."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("ec2", accent="#ED7100")
    base = m.plinth()
    W, D, H = 0.84, 0.78, 1.08
    z0 = base + 0.04
    # Feet, cabinet shell, front frame.
    for x in (-0.36, 0.36):
        for y in (-0.31, 0.31):
            m.cyl(0.04, 0.05, (x, y, base + 0.025), "rubber", verts=12)
    m.box((W, D, H), (0, 0.02, z0 + H / 2), "steel", bevel=0.035)
    m.box((W + 0.02, 0.05, H + 0.02), (0, -D / 2 + 0.005, z0 + H / 2), "bezel", bevel=0.02)
    # Brand band across the top with the service badge.
    m.box((W + 0.03, D + 0.03, 0.09), (0, 0.02, z0 + H + 0.045), "accent", bevel=0.025)
    m.badge((-0.22, -D / 2 - 0.03, z0 + H - 0.075), size=0.2)
    # Four 1U server sleds.
    front = -D / 2 - 0.025
    for i in range(4):
        z = z0 + 0.13 + i * 0.205
        m.box((0.74, 0.04, 0.17), (0, front, z), "bezel", bevel=0.012)
        m.vents((-0.14, front - 0.022, z), 0.34, 0.11, 9)
        for k in range(2):  # hot-swap drive bays
            m.box((0.1, 0.02, 0.12), (0.12 + k * 0.12, front - 0.022, z), "steel_light", bevel=0.006)
        m.led((0.31, front - 0.026, z + 0.04))
        m.led((0.31, front - 0.026, z - 0.03), size=0.025)
        m.box((0.02, 0.03, 0.12), (-0.345, front - 0.03, z), "steel_light", bevel=0.006)  # handle
    # Side vents and rear cable bundle.
    m.vents((W / 2 + 0.008, 0.02, z0 + 0.75), 0.5, 0.36, 7, facing="right")
    m.tube([(-0.2, D / 2 + 0.02, z0 + 0.9), (-0.25, D / 2 + 0.12, z0 + 0.5), (-0.2, D / 2 + 0.08, base + 0.02)], 0.025, "cable")
    m.tube([(0.15, D / 2 + 0.02, z0 + 0.8), (0.22, D / 2 + 0.1, z0 + 0.4), (0.3, D / 2 + 0.06, base + 0.02)], 0.022, "cable")
    m.socket("status", (0, 0, z0 + H + 0.2))
    m.socket("label", (0, 0, z0 + H + 0.15))
    return m


if __name__ == "__main__":
    run(build)
