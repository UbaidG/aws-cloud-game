"""Auto Scaling group: three slim servers on a shared rail, with scale-out arrows."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def server(m, x, z, h):
    m.box((0.24, 0.5, h), (x, 0.02, z + h / 2), "steel", bevel=0.02)
    m.box((0.25, 0.03, h - 0.04), (x, -0.235, z + h / 2), "bezel", bevel=0.008)
    for i in range(int(h / 0.13)):
        zz = z + 0.08 + i * 0.13
        m.vents((x - 0.03, -0.255, zz), 0.12, 0.06, 4)
        m.led((x + 0.08, -0.257, zz), size=0.02)
    m.box((0.25, 0.51, 0.04), (x, 0.02, z + h + 0.02), "accent", bevel=0.012)


def build():
    m = Model("asg", accent="#ED7100")
    base = m.plinth()
    # Shared rail the group stands on.
    m.box((0.98, 0.6, 0.06), (0, 0.02, base + 0.03), "steel_light", bevel=0.015)
    for y in (-0.22, 0.26):
        m.box((0.98, 0.04, 0.03), (0, y, base + 0.075), "accent_dark", bevel=0.008)
    z = base + 0.06
    server(m, -0.3, z, 0.66)
    server(m, 0.0, z, 0.66)
    # The third server is "scaling in": translucent outline being added.
    m.box((0.24, 0.5, 0.66), (0.3, 0.02, z + 0.33), "glass", bevel=0.02)
    m.box((0.25, 0.51, 0.04), (0.3, 0.02, z + 0.68), "accent_glow", bevel=0.012)
    # Scale arrows on the side.
    up = [(-0.06, 0.0), (0.0, 0.08), (0.06, 0.0), (0.02, 0.0), (0.02, -0.07), (-0.02, -0.07), (-0.02, 0.0)]
    m.prism(up, 0.03, (0.3, -0.25, z + 0.36), "accent_glow", rot=(0, 0, 0))
    m.badge((-0.3, -0.29, z + 0.78), size=0.16)
    m.socket("status", (0, 0, z + 0.95))
    m.socket("label", (0, 0, z + 0.9))
    return m


if __name__ == "__main__":
    run(build)
