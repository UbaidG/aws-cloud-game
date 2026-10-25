"""Amazon EBS: a ruggedised block-storage drive in a mounting cradle."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("ebs", accent="#7AA116")
    base = m.plinth()
    z = base
    # Cradle.
    for x in (-0.36, 0.36):
        m.box((0.08, 0.66, 0.36), (x, 0.02, z + 0.18), "steel_light", bevel=0.015)
    m.box((0.8, 0.66, 0.05), (0, 0.02, z + 0.025), "steel", bevel=0.01)
    # Drive body with heatsink fins on top.
    m.box((0.64, 0.6, 0.34), (0, 0.02, z + 0.25), "bezel", bevel=0.03)
    for i in range(9):
        m.box((0.6, 0.025, 0.07), (0, -0.24 + i * 0.06, z + 0.455), "steel", bevel=0.004)
    m.box((0.66, 0.08, 0.06), (0, -0.27, z + 0.34), "accent", bevel=0.012)
    m.badge((-0.17, -0.284, z + 0.2), size=0.15)
    for i in range(3):
        m.led((0.1 + i * 0.07, -0.285, z + 0.2), size=0.025)
    # Connector and cable to the server it attaches to.
    m.box((0.2, 0.06, 0.08), (0.12, 0.33, z + 0.2), "steel_light", bevel=0.01)
    m.tube([(0.12, 0.36, z + 0.2), (0.25, 0.46, z + 0.12), (0.38, 0.48, z + 0.02)], 0.02, "cable")
    m.socket("status", (0, 0, z + 0.75))
    m.socket("label", (0, 0, z + 0.7))
    return m


if __name__ == "__main__":
    run(build)
