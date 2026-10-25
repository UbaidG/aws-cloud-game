"""Amazon API Gateway: a toll booth with a barrier arm across the lane."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("apigw", accent="#8C4FFF")
    base = m.plinth()
    z = base
    # Lane.
    m.box((1.0, 0.5, 0.03), (0, -0.2, z + 0.015), "bezel", bevel=0.006)
    for i in range(4):
        m.box((0.12, 0.03, 0.006), (-0.36 + i * 0.24, -0.2, z + 0.033), "white", bevel=0)
    # Booth.
    m.box((0.4, 0.36, 0.56), (0.24, 0.26, z + 0.28), "white", bevel=0.025)
    m.box((0.42, 0.38, 0.06), (0.24, 0.26, z + 0.59), "accent", bevel=0.02)
    m.box((0.32, 0.02, 0.2), (0.24, 0.075, z + 0.4), "glass", bevel=0)
    m.box((0.36, 0.03, 0.025), (0.24, 0.075, z + 0.29), "accent_dark", bevel=0.005)
    m.box((0.12, 0.03, 0.08), (0.36, 0.07, z + 0.18), "screen", bevel=0)
    m.badge((0.12, 0.072, z + 0.18), size=0.12)
    # Barrier post and striped arm (raised a little).
    m.box((0.1, 0.1, 0.32), (-0.02, 0.03, z + 0.16), "steel", bevel=0.015)
    for i in range(5):
        mat = "accent" if i % 2 == 0 else "white"
        m.box((0.16, 0.04, 0.04), (-0.12 - i * 0.16, 0.0, z + 0.3 + i * 0.012), mat, bevel=0.008, rot=(0, -4, 0))
    m.sphere(0.03, (-0.02, -0.03, z + 0.34), "led", segments=10, rings=6)
    m.socket("status", (0, 0, z + 0.95))
    m.socket("label", (0, 0, z + 0.9))
    return m


if __name__ == "__main__":
    run(build)
