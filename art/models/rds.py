"""Amazon RDS: a managed database: three stacked platters on a storage cabinet."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("rds", accent="#527FFF")
    base = m.plinth()
    # Storage cabinet.
    W, D, H = 0.82, 0.74, 0.36
    m.box((W, D, H), (0, 0.02, base + H / 2), "steel", bevel=0.03)
    front = -D / 2 + 0.02
    m.box((W - 0.06, 0.03, H - 0.08), (0, front - 0.01, base + H / 2), "bezel", bevel=0.012)
    for i in range(6):  # drive slots
        x = -0.12 + i * 0.075
        m.box((0.06, 0.02, 0.2), (x, front - 0.03, base + H / 2), "steel_light", bevel=0.005)
        m.led((x, front - 0.042, base + H / 2 + 0.07), size=0.014)
    m.badge((-0.26, front - 0.032, base + H / 2), size=0.2)
    # The database: three platters with steel separators and a light ring each.
    z = base + H
    r = 0.33
    for i in range(3):
        cz = z + 0.03 + i * 0.2
        m.cyl(r + 0.01, 0.03, (0, 0.02, cz), "steel_light", verts=40, bevel=0.008)
        m.cyl(r, 0.15, (0, 0.02, cz + 0.105), "accent", verts=40, bevel=0.03)
        m.cyl(r + 0.004, 0.018, (0, 0.02, cz + 0.105), "accent_glow", verts=40, bevel=0)
    top = z + 0.03 + 3 * 0.2
    m.cyl(r + 0.01, 0.035, (0, 0.02, top), "steel_light", verts=40, bevel=0.012)
    m.cyl(0.12, 0.02, (0, 0.02, top + 0.025), "accent_dark", verts=32, bevel=0.006)
    m.socket("status", (0, 0, top + 0.2))
    m.socket("label", (0, 0, top + 0.16))
    return m


if __name__ == "__main__":
    run(build)
