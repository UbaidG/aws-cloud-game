"""Internet Users: a desk with a monitor, keyboard, laptop and phone."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("client", accent="#0284C7")
    base = m.plinth()
    z = base
    # Desk.
    top = z + 0.42
    m.box((0.98, 0.62, 0.05), (0, 0.04, top - 0.025), "white", bevel=0.015)
    for x in (-0.44, 0.44):
        m.box((0.04, 0.54, 0.37), (x, 0.04, z + 0.185), "steel", bevel=0.01)
    m.box((0.84, 0.03, 0.18), (0, 0.32, z + 0.3), "steel", bevel=0.008)
    m.badge((0, -0.272, top - 0.12), size=0.16)
    m.box((0.2, 0.02, 0.2), (0, -0.258, top - 0.12), "accent", bevel=0.006)
    # Monitor.
    m.box((0.18, 0.12, 0.015), (-0.1, 0.18, top + 0.008), "steel", bevel=0.005)
    m.box((0.035, 0.035, 0.2), (-0.1, 0.2, top + 0.1), "steel", bevel=0.006)
    m.box((0.58, 0.035, 0.36), (-0.1, 0.16, top + 0.33), "bezel", bevel=0.012, rot=(-6, 0, 0))
    m.box((0.53, 0.01, 0.31), (-0.1, 0.138, top + 0.335), "screen", bevel=0, rot=(-6, 0, 0))
    # Keyboard and mouse.
    m.box((0.38, 0.13, 0.02), (-0.12, -0.12, top + 0.01), "bezel", bevel=0.006)
    for r in range(3):
        m.box((0.34, 0.025, 0.008), (-0.12, -0.165 + r * 0.04, top + 0.022), "steel", bevel=0)
    m.sphere(0.03, (0.14, -0.13, top + 0.01), "bezel", scale=(1, 1.4, 0.5))
    # Laptop on the right, lid open.
    m.box((0.3, 0.2, 0.018), (0.3, 0.02, top + 0.009), "steel_light", bevel=0.006)
    m.box((0.3, 0.012, 0.2), (0.3, 0.12, top + 0.1), "steel_light", bevel=0.005, rot=(-12, 0, 0))
    m.box((0.27, 0.006, 0.17), (0.3, 0.112, top + 0.1), "screen", bevel=0, rot=(-12, 0, 0))
    # Phone on a stand.
    m.box((0.07, 0.012, 0.13), (0.4, -0.18, top + 0.07), "bezel", bevel=0.006, rot=(-15, 0, 0))
    m.box((0.06, 0.004, 0.11), (0.4, -0.188, top + 0.07), "screen", bevel=0, rot=(-15, 0, 0))
    m.socket("status", (0, 0, top + 0.72))
    m.socket("label", (0, 0, top + 0.66))
    return m


if __name__ == "__main__":
    run(build)
