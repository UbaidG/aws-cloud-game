"""Amazon SageMaker: a GPU training rig powering a glowing model core inside spinning rings."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("sagemaker", accent="#01A88D")
    base = m.plinth()
    z = base
    m.box((0.82, 0.64, 0.3), (0, 0.05, z + 0.15), "steel", bevel=0.03)
    for i in range(3):
        x = -0.24 + i * 0.24
        m.box((0.2, 0.02, 0.2), (x, -0.272, z + 0.15), "bezel", bevel=0.01)
        m.cyl(0.07, 0.02, (x, -0.286, z + 0.15), "vent", verts=18, bevel=0, rot=(90, 0, 0))
    m.box((0.84, 0.66, 0.04), (0, 0.05, z + 0.32), "accent", bevel=0.012)
    m.badge((0.3, 0.05, z + 0.342), size=0.14, facing="top")
    m.led((-0.36, -0.272, z + 0.26), size=0.025)
    # Pedestal and the core.
    m.cyl(0.12, 0.12, (0, 0.05, z + 0.4), "steel_light", verts=20, radius2=0.08, bevel=0.012)
    cz = z + 0.72
    m.sphere(0.15, (0, 0.05, cz), "accent_glow", segments=20, rings=10)
    spin = m.group("spin_rings", (0, 0.05, cz))
    m.torus(0.26, 0.016, (0, 0.05, cz), "steel_light", rot=(70, 0, 0), major_segments=32, minor_segments=6, group=spin)
    m.torus(0.3, 0.014, (0, 0.05, cz), "accent", rot=(70, 0, 60), major_segments=32, minor_segments=6, group=spin)
    m.torus(0.22, 0.012, (0, 0.05, cz), "white", rot=(70, 0, -60), major_segments=32, minor_segments=6, group=spin)
    m.socket("status", (0, 0, cz + 0.45))
    m.socket("label", (0, 0, cz + 0.4))
    return m


if __name__ == "__main__":
    run(build)
