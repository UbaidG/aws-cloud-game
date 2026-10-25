"""AWS IAM: a security kiosk with a floating ID card and a key reader."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("iam", accent="#DD344C")
    base = m.plinth()
    z = base
    m.box((0.5, 0.4, 0.62), (0, 0.1, z + 0.31), "white", bevel=0.03)
    m.box((0.52, 0.42, 0.05), (0, 0.1, z + 0.645), "accent", bevel=0.015)
    # Slanted reader face.
    m.box((0.42, 0.04, 0.26), (0, -0.12, z + 0.48), "bezel", bevel=0.012, rot=(-20, 0, 0))
    m.box((0.3, 0.02, 0.16), (0, -0.142, z + 0.5), "screen", bevel=0, rot=(-20, 0, 0))
    m.box((0.18, 0.04, 0.04), (0, -0.12, z + 0.28), "steel", bevel=0.008)
    m.box((0.12, 0.02, 0.012), (0, -0.142, z + 0.28), "vent", bevel=0)
    m.badge((-0.12, -0.102, z + 0.14), size=0.12)
    m.led((0.12, -0.102, z + 0.14))
    # Floating ID card.
    bob = m.group("bob_card", (0, 0.1, z + 0.95))
    m.box((0.36, 0.03, 0.24), (0, 0.1, z + 0.95), "white", bevel=0.02, group=bob)
    m.box((0.36, 0.034, 0.06), (0, 0.1, z + 1.04), "accent", bevel=0.008, group=bob)
    m.cyl(0.045, 0.036, (-0.09, 0.1, z + 0.92), "steel_light", verts=16, bevel=0.004, rot=(90, 0, 0), group=bob)
    for i in range(3):
        m.box((0.14 - i * 0.03, 0.036, 0.016), (0.07 - i * 0.015, 0.1, z + 0.95 - i * 0.04), "steel", bevel=0, group=bob)
    m.socket("status", (0, 0, z + 1.3))
    m.socket("label", (0, 0, z + 1.25))
    return m


if __name__ == "__main__":
    run(build)
