"""AWS WAF: a reinforced firewall with a scanning beam across the top."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("waf", accent="#DD344C")
    base = m.plinth()
    z = base
    # Brick wall, running bond.
    bw, bh = 0.18, 0.1
    for row in range(7):
        off = (row % 2) * bw / 2
        n = 6 if row % 2 else 5
        for i in range(n):
            x = -0.45 + off + i * bw + bw / 2 - (bw / 2 if row % 2 else 0)
            if abs(x) > 0.47:
                continue
            mat = "accent" if (row + i) % 3 else "accent_dark"
            m.box((bw - 0.012, 0.22, bh - 0.012), (x, 0.08, z + 0.05 + row * bh), mat, bevel=0.012)
    top = z + 0.05 + 7 * bh
    m.box((0.98, 0.26, 0.05), (0, 0.08, top - 0.02), "steel", bevel=0.012)
    # Scanner rail and beam.
    m.box((0.9, 0.06, 0.06), (0, -0.05, top + 0.04), "steel_light", bevel=0.012)
    m.box((0.86, 0.02, 0.02), (0, -0.085, top + 0.04), "accent_glow", bevel=0)
    # Shield emblem.
    shield = [(-0.12, 0.12), (0.12, 0.12), (0.12, -0.02), (0.0, -0.14), (-0.12, -0.02)]
    m.prism(shield, 0.04, (0, -0.06, z + 0.38), "steel_light", bevel=0.012)
    m.badge((0, -0.085, z + 0.39), size=0.15)
    # Buttresses.
    for x in (-0.42, 0.42):
        m.box((0.1, 0.36, 0.4), (x, 0.1, z + 0.2), "steel", bevel=0.02)
    m.socket("status", (0, 0, top + 0.3))
    m.socket("label", (0, 0, top + 0.25))
    return m


if __name__ == "__main__":
    run(build)
