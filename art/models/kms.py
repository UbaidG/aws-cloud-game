"""AWS KMS: a vault safe with a combination dial and a key on top."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("kms", accent="#DD344C")
    base = m.plinth()
    z = base
    m.box((0.72, 0.64, 0.7), (0, 0.05, z + 0.35), "steel", bevel=0.04)
    m.box((0.6, 0.04, 0.58), (0, -0.28, z + 0.36), "steel_light", bevel=0.02)
    m.box((0.5, 0.02, 0.48), (0, -0.30, z + 0.36), "accent_dark", bevel=0.012)
    # Dial.
    m.cyl(0.11, 0.05, (0.06, -0.33, z + 0.4), "steel_light", verts=24, bevel=0.01, rot=(90, 0, 0))
    m.cyl(0.075, 0.03, (0.06, -0.36, z + 0.4), "bezel", verts=20, bevel=0.006, rot=(90, 0, 0))
    m.box((0.016, 0.01, 0.05), (0.06, -0.377, z + 0.44), "accent_glow", bevel=0)
    # Handle spokes.
    for k in range(3):
        a = math.radians(90 + k * 120)
        m.cyl(0.012, 0.12, (-0.16 + 0.05 * math.cos(a), -0.35, z + 0.4 + 0.05 * math.sin(a)), "steel_light", verts=8, bevel=0, rot=(0, -math.degrees(a) + 90, 0))
    m.cyl(0.025, 0.04, (-0.16, -0.34, z + 0.4), "steel", verts=10, rot=(90, 0, 0))
    # Hinges.
    for zz in (0.18, 0.54):
        m.cyl(0.025, 0.08, (0.31, -0.29, z + zz), "steel_light", verts=10)
    m.badge((-0.12, -0.312, z + 0.18), size=0.11)
    m.led((0.18, -0.312, z + 0.18))
    # Key on top.
    bob = m.group("bob_key", (0, 0.05, z + 0.9))
    m.torus(0.06, 0.018, (-0.14, 0.05, z + 0.9), "accent", rot=(90, 0, 0), major_segments=20, minor_segments=6, group=bob)
    m.box((0.22, 0.03, 0.03), (0.0, 0.05, z + 0.9), "accent", bevel=0.008, group=bob)
    for x in (0.06, 0.1):
        m.box((0.025, 0.03, 0.05), (x, 0.05, z + 0.87), "accent", bevel=0.005, group=bob)
    m.socket("status", (0, 0, z + 1.2))
    m.socket("label", (0, 0, z + 1.15))
    return m


if __name__ == "__main__":
    run(build)
