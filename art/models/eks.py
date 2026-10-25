"""Amazon EKS: a cluster of pods steered by a turning helm."""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "lib"))
from cc import Model, run


def build():
    m = Model("eks", accent="#ED7100")
    base = m.plinth()
    z = base
    # Control plane pedestal.
    m.cyl(0.4, 0.12, (0, 0, z + 0.06), "steel", verts=7, bevel=0.02)
    # Pods: hexagonal capsules around a central mast.
    for k in range(5):
        a = math.radians(k * 72 + 18)
        x, y = 0.25 * math.cos(a), 0.25 * math.sin(a)
        m.cyl(0.1, 0.26, (x, y, z + 0.25), "accent" if k % 2 else "white", verts=6, bevel=0.015)
        m.cyl(0.065, 0.02, (x, y, z + 0.385), "accent_glow", verts=6, bevel=0)
    m.cyl(0.07, 0.6, (0, 0, z + 0.42), "steel_light", verts=16, bevel=0.01)
    # Helm wheel on top, turning.
    hz = z + 0.75
    spin = m.group("spin_helm", (0, 0, hz))
    m.torus(0.3, 0.025, (0, 0, hz), "accent", major_segments=48, minor_segments=8, group=spin)
    m.cyl(0.08, 0.06, (0, 0, hz), "steel_light", verts=7, bevel=0.01, group=spin)
    for k in range(7):
        a = math.radians(k * 360 / 7)
        x, y = math.cos(a), math.sin(a)
        m.box((0.36, 0.03, 0.03), (0.17 * x, 0.17 * y, hz), "steel_light", bevel=0.006, rot=(0, 0, math.degrees(a)), group=spin)
        m.sphere(0.035, (0.37 * x, 0.37 * y, hz), "accent_dark", segments=10, rings=6, group=spin)
    m.badge((0, -0.36, z + 0.06), size=0.1)
    m.socket("status", (0, 0, hz + 0.3))
    m.socket("label", (0, 0, hz + 0.25))
    return m


if __name__ == "__main__":
    run(build)
