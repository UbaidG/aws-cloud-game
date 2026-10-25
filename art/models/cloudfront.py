"""Amazon CloudFront: an edge tower with cache rings and a turning globe on top."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("cloudfront", accent="#8C4FFF")
    base = m.plinth()
    z = base
    # Hexagonal stepped pylon.
    m.cyl(0.36, 0.16, (0, 0, z + 0.08), "steel", verts=6, bevel=0.025)
    m.cyl(0.26, 0.5, (0, 0, z + 0.41), "steel", verts=6, radius2=0.17, bevel=0.02)
    m.cyl(0.18, 0.04, (0, 0, z + 0.2), "accent_glow", verts=6, bevel=0)
    for k, hz in enumerate((0.36, 0.52)):
        rr = 0.24 - k * 0.04
        m.cyl(rr + 0.025, 0.035, (0, 0, z + hz), "accent", verts=6, bevel=0.01)
    m.cyl(0.07, 0.25, (0, 0, z + 0.78), "steel_light", verts=12, bevel=0.01)
    # Globe with meridian rings.
    gz = z + 1.02
    spin = m.group("spin_globe", (0, 0, gz))
    m.sphere(0.2, (0, 0, gz), "accent_glow", segments=24, rings=12, group=spin)
    m.torus(0.215, 0.012, (0, 0, gz), "steel_light", major_segments=32, minor_segments=6, group=spin)
    m.torus(0.215, 0.012, (0, 0, gz), "steel_light", rot=(90, 0, 0), major_segments=32, minor_segments=6, group=spin)
    m.torus(0.215, 0.012, (0, 0, gz), "steel_light", rot=(90, 0, 60), major_segments=32, minor_segments=6, group=spin)
    m.torus(0.3, 0.014, (0, 0, gz), "accent", rot=(78, 0, 0), major_segments=40, minor_segments=6)
    # Antenna stubs.
    for x in (-0.22, 0.22):
        m.cyl(0.015, 0.22, (x, 0.18, z + 0.27), "steel_light", verts=8, bevel=0)
        m.sphere(0.025, (x, 0.18, z + 0.39), "accent_glow", segments=10, rings=6)
    m.badge((0, -0.315, z + 0.08), size=0.13)
    m.socket("status", (0, 0, gz + 0.35))
    m.socket("label", (0, 0, gz + 0.3))
    return m


if __name__ == "__main__":
    run(build)
