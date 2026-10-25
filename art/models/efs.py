"""Amazon EFS: a shared filing cabinet with its top drawer open."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("efs", accent="#7AA116")
    base = m.plinth()
    z = base
    W, D, H = 0.66, 0.62, 0.96
    m.box((W, D, H), (0, 0.04, z + H / 2), "steel", bevel=0.025)
    m.box((W + 0.02, D + 0.02, 0.04), (0, 0.04, z + H + 0.02), "accent", bevel=0.012)
    front = 0.04 - D / 2
    for i in range(3):
        dz = z + 0.16 + i * 0.3
        open_ = 0.18 if i == 2 else 0
        m.box((W - 0.06, 0.04, 0.26), (0, front - 0.02 - open_, dz), "steel_light", bevel=0.012)
        m.box((0.2, 0.03, 0.03), (0, front - 0.05 - open_, dz + 0.04), "bezel", bevel=0.008)
        m.box((0.12, 0.01, 0.05), (0, front - 0.045 - open_, dz - 0.05), "white", bevel=0)
        if open_:
            m.box((W - 0.1, open_ + 0.02, 0.18), (0, front - open_ / 2, dz + 0.02), "bezel", bevel=0.006)
            for k in range(6):
                m.box((W - 0.16, 0.012, 0.16 + (k % 2) * 0.03), (0, front - 0.03 - k * 0.028, dz + 0.08), "white" if k % 3 else "accent", bevel=0)
    m.badge((0.22, front - 0.042, z + 0.16), size=0.14)
    # Mount points: several servers share this file system.
    for x in (-0.38, 0.38):
        m.cyl(0.03, 0.08, (x, 0.3, z + 0.86), "accent_glow", verts=12, rot=(0, 90, 0))
    m.socket("status", (0, 0, z + H + 0.25))
    m.socket("label", (0, 0, z + H + 0.2))
    return m


if __name__ == "__main__":
    run(build)
