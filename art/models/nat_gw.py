"""NAT Gateway: a one-way turnstile cabinet; traffic can leave, nothing walks in."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


ARROW = [(-0.16, 0.05), (0.04, 0.05), (0.04, 0.12), (0.18, 0.0), (0.04, -0.12), (0.04, -0.05), (-0.16, -0.05)]


def build():
    m = Model("nat_gw", accent="#8C4FFF")
    base = m.plinth()
    z = base
    m.box((0.62, 0.54, 0.62), (-0.12, 0.06, z + 0.31), "steel", bevel=0.03)
    m.box((0.64, 0.56, 0.05), (-0.12, 0.06, z + 0.635), "accent", bevel=0.015)
    m.vents((-0.12, -0.215, z + 0.45), 0.4, 0.12, 8)
    m.badge((-0.12, -0.222, z + 0.22), size=0.16)
    m.led((0.12, -0.222, z + 0.3))
    # Outbound arrow on the side.
    m.prism(ARROW, 0.03, (-0.12, 0.34, z + 0.33), "accent_glow", rot=(0, 0, 180))
    # Turnstile beside the cabinet.
    m.cyl(0.05, 0.42, (0.33, -0.05, z + 0.21), "steel_light", verts=12)
    spin = m.group("spin_turnstile", (0.33, -0.05, z + 0.36))
    for k in range(3):
        a = math.radians(k * 120)
        m.box((0.2, 0.03, 0.03), (0.33 + 0.1 * math.cos(a), -0.05 + 0.1 * math.sin(a), z + 0.36), "steel_light", bevel=0.008, rot=(0, 0, math.degrees(a)), group=spin)
    m.cyl(0.06, 0.05, (0.33, -0.05, z + 0.43), "accent", verts=12, group=spin)
    m.socket("status", (0, 0, z + 0.95))
    m.socket("label", (0, 0, z + 0.9))
    return m


if __name__ == "__main__":
    run(build)
