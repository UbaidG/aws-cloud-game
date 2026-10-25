"""Amazon Redshift: a data warehouse of three silos joined by pipes."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def silo(m, x, y, z, r, h, mat):
    m.cyl(r, h, (x, y, z + h / 2), mat, verts=20, bevel=0.015)
    m.sphere(r, (x, y, z + h), mat, segments=20, rings=6, scale=(1, 1, 0.45))
    for t in (0.3, 0.65):
        m.torus(r + 0.006, 0.012, (x, y, z + h * t), "steel_light", major_segments=20, minor_segments=4)
    m.cyl(r + 0.02, 0.05, (x, y, z + 0.025), "steel", verts=20, bevel=0.01)


def build():
    m = Model("redshift", accent="#8C4FFF")
    base = m.plinth()
    z = base
    silo(m, -0.24, 0.12, z, 0.2, 0.95, "accent")
    silo(m, 0.2, 0.18, z, 0.18, 0.72, "steel")
    silo(m, 0.02, -0.22, z, 0.16, 0.5, "accent_dark")
    m.tube([(-0.24, 0.12, z + 0.7), (-0.02, 0.15, z + 0.75), (0.2, 0.18, z + 0.6)], 0.03, "steel_light")
    m.tube([(0.02, -0.22, z + 0.42), (-0.1, -0.05, z + 0.5), (-0.24, 0.12, z + 0.45)], 0.03, "steel_light")
    m.badge((0.02, -0.383, z + 0.25), size=0.13)
    m.socket("status", (0, 0, z + 1.3))
    m.socket("label", (0, 0, z + 1.25))
    return m


if __name__ == "__main__":
    run(build)
