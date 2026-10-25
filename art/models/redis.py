"""Amazon ElastiCache (Redis): memory modules standing in a board, with red heat spreaders."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("redis", accent="#D82C20")
    base = m.plinth()
    z = base
    # Mainboard.
    m.box((0.94, 0.76, 0.06), (0, 0.02, z + 0.03), "bezel", bevel=0.012)
    for i in range(5):
        m.box((0.03, 0.62, 0.05), (-0.3 + i * 0.15, 0.04, z + 0.085), "steel_light", bevel=0.006)  # slots
        m.box((0.05, 0.58, 0.5), (-0.3 + i * 0.15, 0.04, z + 0.36), "accent", bevel=0.012)  # spreader
        m.box((0.054, 0.5, 0.06), (-0.3 + i * 0.15, 0.04, z + 0.58), "accent_dark", bevel=0.006)
        for k in range(4):
            m.box((0.056, 0.1, 0.12), (-0.3 + i * 0.15, -0.16 + k * 0.13, z + 0.32), "steel", bevel=0.004)
        m.led((-0.3 + i * 0.15, -0.255, z + 0.52), size=0.025)
    # Chip and capacitors on the board front.
    m.box((0.22, 0.12, 0.04), (0.3, -0.3, z + 0.08), "steel", bevel=0.008)
    for x in (-0.38, -0.32, -0.26):
        m.cyl(0.02, 0.07, (x, -0.3, z + 0.095), "steel_light", verts=10, bevel=0.004)
    m.badge((0.0, -0.345, z + 0.035), size=0.06)
    m.box((0.3, 0.012, 0.06), (0.0, -0.339, z + 0.035), "bezel", bevel=0)
    m.socket("status", (0, 0, z + 0.85))
    m.socket("label", (0, 0, z + 0.8))
    return m


if __name__ == "__main__":
    run(build)
